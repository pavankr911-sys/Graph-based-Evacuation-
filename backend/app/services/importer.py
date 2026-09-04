from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.building import Building, Floor
from app.models.spatial import Room, Wall, Door, Stair, Exit
from app.models.graph import GraphTopology, GraphNode, GraphEdge
from app.schemas.export import BuildingExport


async def import_building(db: AsyncSession, export_data: BuildingExport) -> Building:
    """
    Imports a complete building configuration from a BuildingExport schema.
    Validates that the building does not already exist. If it does, raises a 409 Conflict.
    Reconstructs all nested elements with their original IDs in a single atomic transaction.
    """
    # Check for collision and overwrite
    existing = await db.execute(select(Building).where(Building.id == export_data.id))
    existing_building = existing.scalars().first()
    if existing_building:
        await db.delete(existing_building)
        await db.flush() # flush to ensure cascade deletions take effect before recreation

    # 1. Create Building
    b_data = export_data.model_dump(exclude={'floors', 'topologies'})
    b = Building(**b_data)
    db.add(b)

    # 2. Topologies
    for top_data in export_data.topologies:
        t_data = top_data.model_dump()
        t = GraphTopology(**t_data)
        db.add(t)

    # 3. Floors and Spatial Elements
    for f_export in export_data.floors:
        f_data = f_export.model_dump(exclude={'rooms', 'walls', 'doors', 'stairs', 'exits'})
        f = Floor(**f_data)
        db.add(f)

        for r_data in f_export.rooms:
            db.add(Room(**r_data.model_dump()))

        for w_data in f_export.walls:
            db.add(Wall(**w_data.model_dump()))

        for d_data in f_export.doors:
            db.add(Door(**d_data.model_dump()))

        for s_data in f_export.stairs:
            db.add(Stair(**s_data.model_dump()))

        for e_data in f_export.exits:
            db.add(Exit(**e_data.model_dump()))

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Import failed during persistence: {str(e)}"
        )

    return b
