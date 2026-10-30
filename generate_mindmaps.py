import os
os.environ['MPLCONFIGDIR'] = os.path.join(os.environ.get('TEMP', '.'), 'mpl_cache')
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_mindmap_architecture():
    fig, ax = plt.subplots(figsize=(12, 7.5), dpi=300)
    ax.set_facecolor('#F8FAFC')
    fig.patch.set_facecolor('#F8FAFC')
    ax.axis('off')

    # Center Node
    center_box = patches.FancyBboxPatch((4.5, 4.3), 3.0, 1.4, boxstyle="round,pad=0.2,rounding_size=0.15",
                                        facecolor='#0F172A', edgecolor='#38BDF8', linewidth=2.5)
    ax.add_patch(center_box)
    ax.text(6.0, 5.0, "INTELLIGENT EMERGENCY\nEVACUATION DIGITAL TWIN\n(Core System)", 
            color='white', fontsize=11, fontweight='bold', ha='center', va='center', family='sans-serif')

    # Subsystems (Branches)
    subsystems = [
        # (x, y, w, h, bg_color, border_color, title, items, connect_xy)
        (0.5, 6.5, 3.2, 1.8, '#EFF6FF', '#2563EB', "1. Blueprint Digitization (CV)",
         ["• OpenCV Adaptive Thresholding", "• Morphological Line Filtering", "• Hough Line Transforms", "• Vector CAD Boundary Extraction"],
         (3.7, 7.4)),

        (4.4, 7.2, 3.2, 1.8, '#F0FDF4', '#16A34A', "2. Spatial Graph Discretizer",
         ["• 8-Neighbor Moore Grid Graph", "• Wall Obstruction Pruning", "• Multi-Story Stair Shafts (3D)", "• Tarjan's Bridge & Cut-Vertex Audit"],
         (6.0, 7.2)),

        (8.3, 6.5, 3.2, 1.8, '#FEF2F2', '#DC2626', "3. Dynamic Hazard Engine",
         ["• Cellular Fire Automaton", "• Toxic Smoke & CO Dispersion", "• Thermal Radiation Gradients", "• Dynamic Edge Weight Invalidation"],
         (8.3, 7.4)),

        (8.3, 2.0, 3.2, 2.0, '#FAF5FF', '#9333EA', "4. Multi-Horizon Pathfinding",
         ["• Reverse Multi-Source Dijkstra", "• Algo A: Static Distance Baseline", "• Algo B: Hazard-Risk Weighting", "• Algo C: Real-Time Queue Aware", "• Algo D: Predictive Multi-Horizon"],
         (8.3, 3.0)),

        (4.4, 1.0, 3.2, 1.9, '#FFFBEB', '#D97706', "5. Heterogeneous Occupants",
         ["• Demographics: Adult, Child, Elderly", "• Mobility-Impaired & Staff Speeds", "• NFPA/SFPE Flow Capacity (1.33 p/m/s)", "• Reaction Times & Risk Tolerance"],
         (6.0, 2.9)),

        (0.5, 2.0, 3.2, 2.0, '#ECFEFF', '#0891B2', "6. Digital Twin Viewport & UI",
         ["• Dual Synchronized 2D/3D View", "• WebGL Three.js / React Three Fiber", "• Exit Intelligence Live HUD", "• Vogel Spiral Safe Muster Area", "• Scrubber Playback & Race Analytics"],
         (3.7, 3.0))
    ]

    for x, y, w, h, bg, border, title, items, conn_pt in subsystems:
        # Draw connector line from center
        ax.annotate('', xy=conn_pt, xytext=(6.0, 5.0),
                    arrowprops=dict(arrowstyle="->", color='#64748B', lw=1.8, ls='--',
                                    connectionstyle="arc3,rad=0.05"))
        
        box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.15,rounding_size=0.1",
                                    facecolor=bg, edgecolor=border, linewidth=1.8)
        ax.add_patch(box)
        
        # Title bar
        ax.text(x + w/2.0, y + h - 0.25, title, color=border, fontsize=9.5, fontweight='bold', ha='center', va='center')
        
        # Items
        text_y = y + h - 0.55
        for item in items:
            ax.text(x + 0.15, text_y, item, color='#1E293B', fontsize=8, ha='left', va='center')
            text_y -= 0.32

    ax.set_xlim(0, 12)
    ax.set_ylim(0.5, 9.5)
    plt.tight_layout()
    plt.savefig('mindmap_architecture.png', dpi=300, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close()
    print("Generated mindmap_architecture.png")

def draw_workflow_diagram():
    fig, ax = plt.subplots(figsize=(12, 5.5), dpi=300)
    ax.set_facecolor('#F8FAFC')
    fig.patch.set_facecolor('#F8FAFC')
    ax.axis('off')

    stages = [
        ("STAGE 1\nArchitectural\nIngestion", 
         "• Raster Floorplan Upload\n• OpenCV Blueprint Digitize\n• 2D CAD Interactive Editor", 
         '#EFF6FF', '#1D4ED8'),

        ("STAGE 2\nTopological\nGraph Modeling", 
         "• 8-Neighbor Grid Discretize\n• 3D Stairwell Linkages\n• Tarjan Cut-Vertex Audit", 
         '#F0FDF4', '#15803D'),

        ("STAGE 3\nScenario &\nHazard Setup", 
         "• Heterogeneous Agents Spawning\n• Ignition Points & Fire Rates\n• Algo Selection (A, B, C, D)", 
         '#FEF2F2', '#B91C1C'),

        ("STAGE 4\nSimulation &\nRerouting Loop", 
         "• 5Hz Discrete-Event Loop\n• Reverse Multi-Source Dijkstra\n• Multi-Horizon Queue Forecast", 
         '#FAF5FF', '#7E22CE'),

        ("STAGE 5\nDigital Twin\n& Gathering", 
         "• Dual 2D Canvas & 3D ThreeJS\n• Real-Time Exit HUD\n• Vogel Spiral Muster Zone", 
         '#ECFEFF', '#0E7490'),

        ("STAGE 6\nAnalytics &\nEmpirical Race", 
         "• Head-to-Head Algorithm Race\n• Total Evacuation Time (TET)\n• Trapped & Bottleneck Stats", 
         '#FFFBEB', '#B45309')
    ]

    box_w = 1.65
    box_h = 4.2
    start_x = 0.4
    gap = 0.32

    for i, (stg_title, stg_desc, bg_col, bdr_col) in enumerate(stages):
        x = start_x + i * (box_w + gap)
        y = 0.65

        box = patches.FancyBboxPatch((x, y), box_w, box_h, boxstyle="round,pad=0.1,rounding_size=0.12",
                                    facecolor=bg_col, edgecolor=bdr_col, linewidth=2)
        ax.add_patch(box)

        # Header tag
        hdr_box = patches.FancyBboxPatch((x + 0.1, y + box_h - 1.15), box_w - 0.2, 0.95, 
                                         boxstyle="round,pad=0.05,rounding_size=0.08",
                                         facecolor=bdr_col, edgecolor='none')
        ax.add_patch(hdr_box)
        ax.text(x + box_w/2.0, y + box_h - 0.67, stg_title, color='white', 
                fontsize=8.5, fontweight='bold', ha='center', va='center', multialignment='center')

        # Desc
        ax.text(x + 0.12, y + box_h - 1.45, stg_desc, color='#1E293B', 
                fontsize=7.8, ha='left', va='top', linespacing=1.6)

        # Connector arrow to next stage
        if i < len(stages) - 1:
            next_x = x + box_w
            ax.annotate('', xy=(next_x + gap - 0.04, y + box_h / 2.0), xytext=(next_x + 0.04, y + box_h / 2.0),
                        arrowprops=dict(arrowstyle="-|>", color='#475569', lw=2.2, mutation_scale=12))

    ax.set_xlim(0, 12.2)
    ax.set_ylim(0, 5.5)
    plt.tight_layout()
    plt.savefig('workflow_diagram.png', dpi=300, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close()
    print("Generated workflow_diagram.png")

if __name__ == '__main__':
    draw_mindmap_architecture()
    draw_workflow_diagram()

