with open('backend/alembic/versions/a85237b5430e_add_graph_models.py', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("sa.PrimaryKeyConstraint('id')\n    op.create_index", "sa.PrimaryKeyConstraint('id')\n    )\n    op.create_index")
content = content.replace("    )\n    )\n    op.create_table", "    )\n    op.create_table")
with open('backend/alembic/versions/a85237b5430e_add_graph_models.py', 'w', encoding='utf-8') as f:
    f.write(content)
