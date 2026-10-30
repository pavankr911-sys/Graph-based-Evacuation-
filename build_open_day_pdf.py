import os
import sys

os.environ['MPLCONFIGDIR'] = os.path.join(os.environ.get('TEMP', '.'), 'mpl_cache')

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register Segoe UI TrueType fonts for native Windows typography & unicode glyphs
font_dir = "C:/Windows/Fonts"
pdfmetrics.registerFont(TTFont('SegoeUI', os.path.join(font_dir, 'segoeui.ttf')))
pdfmetrics.registerFont(TTFont('SegoeUI-Bold', os.path.join(font_dir, 'segoeuib.ttf')))
pdfmetrics.registerFont(TTFont('SegoeUI-Italic', os.path.join(font_dir, 'segoeuii.ttf')))
pdfmetrics.registerFont(TTFont('SegoeUI-BoldItalic', os.path.join(font_dir, 'segoeuiz.ttf')))

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("SegoeUI", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Running Header on page 2+
        if self._pageNumber > 1:
            self.drawString(36, 812, "INTELLIGENT EMERGENCY EVACUATION DIGITAL TWIN | OPEN DAY DEMO & VIVA GUIDE")
            self.drawRightString(559, 812, "PROJECT DEFENSE BRIEF")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.6)
            self.line(36, 806, 559, 806)

        # Running Footer on all pages
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.6)
        self.line(36, 40, 559, 40)
        
        self.drawString(36, 28, "Department of Computer Science & Engineering | Open Day Project Showcase")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(559, 28, page_str)
        self.restoreState()

def build_pdf():
    pdf_filename = "OPEN_DAY_PROJECT_DEMO_GUIDE.pdf"
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=44,
        bottomMargin=46
    )

    PRIMARY = colors.HexColor("#0F172A")     # Slate 900
    SECONDARY = colors.HexColor("#1E293B")   # Slate 800
    ACCENT_BLUE = colors.HexColor("#0284C7") # Sky 600
    ACCENT_GREEN = colors.HexColor("#059669")# Emerald 600
    ACCENT_RED = colors.HexColor("#DC2626")   # Rose 600
    BG_LIGHT = colors.HexColor("#F8FAFC")
    TEXT_DARK = colors.HexColor("#0F172A")
    TEXT_MUTED = colors.HexColor("#334155")

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='SegoeUI-Bold',
        fontSize=19,
        leading=23,
        textColor=PRIMARY,
        alignment=TA_CENTER
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='SegoeUI-Bold',
        fontSize=10.5,
        leading=14,
        textColor=ACCENT_BLUE,
        alignment=TA_CENTER
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='SegoeUI-Bold',
        fontSize=12,
        leading=15,
        textColor=PRIMARY,
        spaceBefore=11,
        spaceAfter=4,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='SegoeUI-Bold',
        fontSize=9.5,
        leading=13,
        textColor=SECONDARY,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyCustom',
        parent=styles['Normal'],
        fontName='SegoeUI',
        fontSize=8.2,
        leading=11.2,
        textColor=TEXT_DARK,
        spaceAfter=3
    )

    body_justify = ParagraphStyle(
        'BodyJustifyCustom',
        parent=body_style,
        alignment=TA_JUSTIFY
    )

    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=body_style,
        leftIndent=10,
        spaceAfter=2.5
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='SegoeUI-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=TA_CENTER
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='SegoeUI',
        fontSize=7.8,
        leading=10,
        textColor=TEXT_DARK
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell,
        fontName='SegoeUI-Bold'
    )

    q_style = ParagraphStyle(
        'VivaQuestion',
        parent=styles['Normal'],
        fontName='SegoeUI-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=PRIMARY,
        spaceBefore=4,
        spaceAfter=1.5,
        keepWithNext=True
    )

    a_style = ParagraphStyle(
        'VivaAnswer',
        parent=body_style,
        fontSize=7.8,
        leading=10.5,
        textColor=TEXT_MUTED,
        leftIndent=6,
        spaceAfter=4
    )

    story = []

    # ========================================================
    # PAGE 1: TITLE, PROBLEM STATEMENT, PROPOSED SOLUTION
    # ========================================================
    story.append(Paragraph("INTELLIGENT EMERGENCY EVACUATION DIGITAL TWIN", title_style))
    story.append(Spacer(1, 2))
    story.append(Paragraph("Graph-Based Evacuation Simulation, Predictive Load-Aware Exit Allocation & Dynamic Hazard Modeling", subtitle_style))
    story.append(Spacer(1, 4))

    meta_data = [[
        Paragraph("<b>Academic Defense & Open Day Project Brief</b> | System Version: 1.0.0 Production MVP | Architecture: FastAPI & Next.js 16 (React 19 / Three.js)", 
                  ParagraphStyle('MetaC', parent=body_style, alignment=TA_CENTER, fontSize=7.8, textColor=PRIMARY))
    ]]
    meta_table = Table(meta_data, colWidths=[523])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#E0F2FE")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#38BDF8")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 6))

    # SECTION 1
    story.append(Paragraph("1. The Core Problem Statement & Research Motivation", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=1, spaceAfter=4))

    p1 = (
        "Modern multi-story infrastructures—such as university academic wings, medical centers, commercial complexes, and transit "
        "hubs—host dense, heterogeneous populations. In the event of a sudden indoor disaster (such as a propagating fire, toxic smoke plume, "
        "or structural failure), traditional evacuation approaches fail catastrophically due to four fundamental deficiencies:"
    )
    story.append(Paragraph(p1, body_justify))

    prob_items = [
        ("Static Shortest-Path Bias (The Herding Defect): ", "Occupants instinctively flee through primary, familiar entrances or follow static exit signs that direct everyone to the geometrically nearest door. This causes fatal crowd crush and extreme exit queuing, while equidistant secondary emergency exits remain completely idle."),
        ("Dynamic Hazard Blindness: ", "Conventional building egress schemes assume all designated hallways remain clear indefinitely. In reality, thermal radiation and lethal carbon monoxide spread dynamically, transforming shortest paths into lethal dead ends within seconds."),
        ("Vertical Egress Chokepoints: ", "Stairwells possess inherently lower discharge rates (~0.6x corridor velocity). When intermediate floors simultaneously pour occupants into stairwells, compression shockwaves paralyze vertical egress."),
        ("Manual Blueprint Modeling: ", "Translating physical blueprints or CAD drawings into simulation models traditionally takes architectural teams weeks of manual CAD tracing, preventing rapid safety auditing and real-time response.")
    ]
    for lbl, desc in prob_items:
        story.append(Paragraph(f"• <b>{lbl}</b>{desc}", bullet_style))

    story.append(Spacer(1, 3))

    comp_data = [
        [Paragraph("Feature / Attribute", table_header), Paragraph("Conventional Static Evacuation", table_header), Paragraph("Our Intelligent Digital Twin Solution", table_header)],
        [Paragraph("<b>Route Decision Logic</b>", table_cell), Paragraph("Static distance-to-exit (nearest door signs)", table_cell), Paragraph("Dynamic multi-objective cost (distance, queue, fire)", table_cell_bold)],
        [Paragraph("<b>Congestion Handling</b>", table_cell), Paragraph("None; occupants crush at primary exit", table_cell), Paragraph("Predictive queue load balancing across all exits", table_cell_bold)],
        [Paragraph("<b>Hazard Awareness</b>", table_cell), Paragraph("Blind to smoke, heat, and spreading fire", table_cell), Paragraph("Cellular automaton fire/smoke avoidance in real time", table_cell_bold)],
        [Paragraph("<b>Blueprint Ingestion</b>", table_cell), Paragraph("Days/weeks of manual CAD vectorization", table_cell), Paragraph("1-click Computer Vision raster blueprint vectorization", table_cell_bold)],
        [Paragraph("<b>Visualization & Twin</b>", table_cell), Paragraph("2D static architectural schematics", table_cell), Paragraph("Synchronized dual 2D SVG & 3D WebGL (Three.js) digital twin", table_cell_bold)],
    ]
    comp_table = Table(comp_data, colWidths=[110, 200, 213])
    comp_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(comp_table)
    story.append(Spacer(1, 5))

    # SECTION 2
    story.append(Paragraph("2. The Proposed Solution: Intelligent Evacuation Digital Twin", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=1, spaceAfter=4))

    p2 = (
        "Our system introduces an integrated, end-to-end <b>Digital Twin Platform</b> that unifies automated computer vision blueprint "
        "vectorization, discrete topological spatial graph modeling, multi-horizon predictive routing, and interactive dual-viewport 3D visualization. "
        "Rather than treating evacuation as an offline academic exercise, our digital twin continuously monitors door queues, forecasts "
        "bottlenecks <i>before</i> they materialize, and recalculates safe, balanced escape paths dynamically."
    )
    story.append(Paragraph(p2, body_justify))

    sol_bullets = [
        ("Automated Blueprint Digitization (CV): ", "Ingests raster floor plans (PNG/JPG), isolates wall contours, extracts doorway portals, and derives metric-scaled rooms in seconds."),
        ("Multi-Story Spatial Navigation Graph: ", "Discretizes floor spaces into an 8-neighbor Moore navigation grid (G = (V, E)), linking multiple vertical stories through 3D stair shafts with physical passage constraints."),
        ("Tarjan Graph-Theoretic Verification: ", "Audits floor plans using Tarjan's Bridge and Cut-Vertex detection algorithm to flag single points of failure (corridors whose blockage cuts off entire wings) prior to emergencies."),
        ("Predictive Dynamic Rerouting Engine: ", "Four distinct routing algorithms benchmarked head-to-head, featuring our novel multi-horizon predictive load-balancing algorithm (Algorithm D)."),
        ("Synchronized 2D/3D Digital Twin Visualizer: ", "Dual viewport powered by React 19 and Three.js (React Three Fiber) with real-time exit queue depth indicators, time-scrubbing playback, and post-exit safe gathering.")
    ]
    for lbl, desc in sol_bullets:
        story.append(Paragraph(f"• <b>{lbl}</b>{desc}", bullet_style))

    # ========================================================
    # PAGE 2: CORE CONCEPTS & MATHEMATICAL FORMULATIONS
    # ========================================================
    story.append(PageBreak())
    story.append(Paragraph("3. Core Concepts & Mathematical Formulations", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=1, spaceAfter=4))

    story.append(Paragraph("3.1 Topological Graph Discretization & Moore Connectivity", h2_style))
    p_graph = (
        "Every continuous indoor floor is mapped to an undirected spatial graph <b>G = (V, E)</b>. Walkable areas are discretized "
        "into grid nodes using 8-neighbor Moore connectivity (allowing diagonal movement at cost √2 · d). Edges intersecting structural walls "
        "are pruned. Portal nodes represent doors, while stair nodes link floor k to floor k-1 across identical (X, Y) spatial bounds."
    )
    story.append(Paragraph(p_graph, body_justify))

    story.append(Paragraph("3.2 Pre-Simulation Graph Verification (Tarjan's Bridge & Cut-Vertex Analysis)", h2_style))
    p_tarjan = (
        "To guarantee architectural life-safety, the backend executes Tarjan's linear-time depth-first algorithm (O(|V| + |E|)) "
        "using discovery time disc[u] and low-point reachability low[u]. A vertex u is flagged as an <b>Articulation Point (Cut-Vertex)</b> "
        "if low[v] >= disc[u] for any neighbor v. If a fire ignites on an articulation edge, all occupants in child subtrees become trapped."
    )
    story.append(Paragraph(p_tarjan, body_justify))

    story.append(Paragraph("3.3 Heterogeneous Demographics & NFPA / SFPE Crowd Dynamics", h2_style))
    p_demo = (
        "Human agents are modeled heterogeneously across 5 demographic cohorts with distinct walking speeds, reaction delays, and physical footprints: "
        "<b>Adults</b> (1.2–1.4 m/s), <b>Children</b> (0.9–1.1 m/s), <b>Elderly</b> (0.7–0.9 m/s), <b>Mobility-Impaired</b> (0.4–0.6 m/s, wheelchair accessible), "
        "and <b>Trained Staff / Wardens</b> (1.5–1.7 m/s). Corridor flow capacities adhere to the SFPE Handbook standard of <b>1.33 persons / (m · s)</b>, "
        "with stair descent throttled to <b>0.6x horizontal velocity</b>."
    )
    story.append(Paragraph(p_demo, body_justify))

    story.append(Paragraph("3.4 The Four Evacuation Routing Algorithms (A, B, C, D)", h2_style))
    
    algo_data = [
        [Paragraph("Algorithm", table_header), Paragraph("Core Routing Strategy", table_header), Paragraph("Mathematical Cost Function / Invalidation", table_header)],
        [Paragraph("<b>Algorithm A</b><br/>(Static Baseline)", table_cell), Paragraph("Static Shortest Path (Standard Dijkstra/A*) to nearest static exit door.", table_cell), Paragraph("Cost(e) = Distance(u, v)<br/><i>Zero hazard or congestion sensitivity.</i>", table_cell)],
        [Paragraph("<b>Algorithm B</b><br/>(Safety-Aware)", table_cell), Paragraph("Hazard-avoidance routing; penalizes spreading smoke, fire, and heat.", table_cell), Paragraph("Cost(e) = Dist(e) + γ · HazardIntensity(v)<br/><i>Routes around fire; ignores door bottlenecks.</i>", table_cell)],
        [Paragraph("<b>Algorithm C</b><br/>(Load-Aware)", table_cell), Paragraph("Congestion-avoidance routing based on instantaneous door queue length.", table_cell), Paragraph("Cost(e) = Dist(e) + δ · CurrentQueue(Exit_k)<br/><i>Balances instantaneous queues; prone to oscillation.</i>", table_cell)],
        [Paragraph("<b>Algorithm D</b><br/><b>(Proposed System)</b>", table_cell_bold), Paragraph("<b>Predictive Multi-Horizon Safety & Dynamic Load Rerouting.</b>", table_cell_bold), Paragraph("<b>Cost(e) = α·Dist + β·Time + γ·Hazard + δ·Queue + ε·PredictedQueue(t+τ)</b><br/>Coupled with threshold-based hysteresis (ΔCost > ε_threshold) to eliminate path ping-ponging.", table_cell_bold)],
    ]
    algo_table = Table(algo_data, colWidths=[90, 195, 238])
    algo_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SECONDARY),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT, colors.white, colors.HexColor("#ECFDF5")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(algo_table)
    story.append(Spacer(1, 4))

    story.append(Paragraph("3.5 Post-Exit Safe Gathering: Vogel Golden-Spiral Phyllotaxis", h2_style))
    p_vogel = (
        "Once agents cross exterior exit thresholds, they must not vanish or freeze at doors (which causes artificial jams). "
        "Our engine routes them into an outdoor safe muster area using <b>Vogel's Golden-Spiral Phyllotaxis model</b>: "
        "<i>r = c · √k</i>, <i>θ = k · 137.508°</i> (the Golden Angle). This guarantees uniform, non-colliding human packing without boundary pileup."
    )
    story.append(Paragraph(p_vogel, body_justify))

    # ========================================================
    # PAGE 3: VISUAL MIND MAPS
    # ========================================================
    story.append(PageBreak())
    story.append(Paragraph("4. Visual Mind Maps & System Architecture", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=1, spaceAfter=4))

    story.append(Paragraph("Figure 4.1: Core System Architecture & Subsystem Taxonomy Mind Map", h2_style))
    if os.path.exists("mindmap_architecture.png"):
        story.append(Image("mindmap_architecture.png", width=500, height=310))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Figure 4.2: End-to-End System Execution & Evacuation Workflow Diagram", h2_style))
    if os.path.exists("workflow_diagram.png"):
        story.append(Image("workflow_diagram.png", width=500, height=228))

    # ========================================================
    # PAGE 4: END-TO-END WORKFLOW STEP-BY-STEP
    # ========================================================
    story.append(PageBreak())
    story.append(Paragraph("5. Step-by-Step End-to-End System Workflow", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=1, spaceAfter=5))

    p_wf = (
        "For the Open Day demonstration, visitors can experience the complete execution pipeline in seven distinct phases:"
    )
    story.append(Paragraph(p_wf, body_justify))
    story.append(Spacer(1, 3))

    wf_steps = [
        ("Step 1: Ingestion & Digitization (The Blueprint Engine)", 
         "Users upload a standard PNG/JPG floorplan or sketch. The OpenCV pipeline executes Gaussian adaptive thresholding, horizontal/vertical morphological kernel filtering, and probabilistic Hough line transforms to vectorize walls and doors into JSON geometries in under 2 seconds. Alternatively, users can draw rooms directly using our interactive 2D CAD canvas editor with snap-to-grid snapping."),

        ("Step 2: Spatial Discretization & Graph Generation", 
         "The backend discretizes the multi-floor spatial boundaries into an 8-neighbor Moore navigation grid. Intersecting walls are pruned from the traversable edge set. Stair shafts link corresponding coordinates on Floor k to Floor k-1. Edge weights reflect physical Euclidean distance normalized by corridor traversal speed."),

        ("Step 3: Graph Verification & Structural Auditing", 
         "The engine runs Tarjan's cut-vertex algorithm, verifying global graph reachability, dead-ends, and bottleneck egress capacity. If any room is isolated or dependent on a single vulnerable doorway, it is highlighted visually on the canvas before any simulation begins."),

        ("Step 4: Scenario Configuration & Demographics Seeding", 
         "The operator selects occupant count (e.g., 50–200 agents), demographic distribution (Adults, Children, Elderly, Mobility-Impaired, Staff), fire ignition nodes, hazard spread rate, and selected routing algorithms (single run or 4-algorithm Head-to-Head Race)."),

        ("Step 5: High-Performance Discrete-Event Simulation Loop", 
         "The simulation executes at 5 Hz (0.2s discrete ticks). For each tick, the Reverse Multi-Source Dijkstra flow-field is evaluated. As exit queues build up or fire advances, Algorithm D evaluates predicted horizon load (t + τ) and re-routes evacuees dynamically before lethal stampedes occur."),

        ("Step 6: Digital Twin Telemetry & Dual Viewport Synchronization", 
         "Every simulation frame streams agent positions, hazard heatmaps, and door queue depths to the frontend via JSON telemetry. Users can seamlessly toggle between the 2D topological canvas and the 3D WebGL (Three.js) digital twin viewport, scrub the interactive timeline, and monitor the live Exit Intelligence HUD."),

        ("Step 7: Post-Exit Safe Muster & Comparative Analytics", 
         "Agents crossing exterior exit portals smoothly disperse into the exterior Vogel spiral muster zone. Once all agents reach safety, the Analytics Dashboard compares Total Evacuation Time (TET), average evacuation time, and cumulative hazard exposure curves, proving the superiority of Algorithm D.")
    ]

    for lbl, desc in wf_steps:
        s_box = [
            [Paragraph(f"<b>{lbl}</b>", ParagraphStyle('WFLbl', parent=body_style, fontName='SegoeUI-Bold', textColor=ACCENT_BLUE))],
            [Paragraph(desc, body_style)]
        ]
        st = Table(s_box, colWidths=[523])
        st.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
            ('BACKGROUND', (0,1), (-1,1), colors.white),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
            ('LINELEFT', (0,0), (0,0), 3, ACCENT_BLUE),
            ('TOPPADDING', (0,0), (-1,-1), 2.5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ]))
        story.append(st)
        story.append(Spacer(1, 3.5))

    # ========================================================
    # PAGE 5: TECHNOLOGIES & PROS/CONS
    # ========================================================
    story.append(PageBreak())
    story.append(Paragraph("6. Comprehensive Technology Stack & Tools Used", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=1, spaceAfter=4))

    tech_data = [
        [Paragraph("Subsystem", table_header), Paragraph("Technologies & Frameworks", table_header), Paragraph("Key Role / Architectural Function", table_header)],
        [Paragraph("<b>Frontend Framework</b>", table_cell), Paragraph("Next.js 16 (App Router), React 19, Strict TypeScript", table_cell), Paragraph("Single Page Command Center, high-performance client rendering", table_cell)],
        [Paragraph("<b>3D Digital Twin</b>", table_cell), Paragraph("Three.js, React Three Fiber (R3F), React Three Drei", table_cell), Paragraph("Isometric 3D multi-floor rendering, real-time lighting, agent meshes", table_cell)],
        [Paragraph("<b>2D Editor & Canvas</b>", table_cell), Paragraph("HTML5 Canvas API, SVG Overlay, Lucide-React Icons", table_cell), Paragraph("Interactive pan/zoom, room/door/wall snapping, topological graph view", table_cell)],
        [Paragraph("<b>State Management</b>", table_cell), Paragraph("Zustand (editorStore.ts), React Hooks", table_cell), Paragraph("Zero-boilerplate reactive state, frame buffers, timeline playback", table_cell)],
        [Paragraph("<b>Backend Core API</b>", table_cell), Paragraph("FastAPI (Python 3.14/3.11), Uvicorn, ASGI Async", table_cell), Paragraph("High-throughput REST API, WebSocket/SSE telemetry, JSON serialization", table_cell)],
        [Paragraph("<b>Computer Vision</b>", table_cell), Paragraph("OpenCV (cv2), NumPy", table_cell), Paragraph("Blueprint adaptive thresholding, morphological filtering, Hough lines", table_cell)],
        [Paragraph("<b>Graph & Math Core</b>", table_cell), Paragraph("Custom Reverse Dijkstra, NetworkX, SciPy", table_cell), Paragraph("Spatial Moore grid generation, Tarjan cut-vertices, multi-horizon routing", table_cell)],
        [Paragraph("<b>Data Persistence</b>", table_cell), Paragraph("SQLAlchemy 2.0 Async, SQLite / PostgreSQL, Alembic", table_cell), Paragraph("Relational models: Buildings, Floors, Elements, Sim Runs, Metrics", table_cell)],
        [Paragraph("<b>Analytics & Testing</b>", table_cell), Paragraph("Recharts, Pytest (84/84 Unit & Integration Tests)", table_cell), Paragraph("Comparative TET bar charts, evacuation curves, deterministic regression", table_cell)]
    ]
    tech_table = Table(tech_data, colWidths=[105, 175, 243])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 2.2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.2),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(tech_table)
    story.append(Spacer(1, 6))

    story.append(Paragraph("7. In-Depth Pros and Cons Analysis", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=1, spaceAfter=4))

    pros_cons_data = [
        [Paragraph("Key Advantages & Strengths (Pros)", table_header), Paragraph("Current Limitations & Trade-Offs (Cons)", table_header)],
        [
            Paragraph(
                "• <b>Substantial TET Reduction:</b> Algorithm D achieves an empirical 18% to 32% reduction in Total Evacuation Time over static A*.<br/>"
                "• <b>Proactive Load Balancing:</b> Eliminates exit crush bottlenecks by steering occupants toward underutilized exits <i>before</i> jams peak.<br/>"
                "• <b>Automated Blueprint Ingestion:</b> Converts scanned floorplans into metric graphs in seconds, eliminating manual CAD overhead.<br/>"
                "• <b>Rigorous Structural Safety:</b> Identifies architectural cut-vertices and dead-ends using formal Tarjan graph theory.<br/>"
                "• <b>Dual 2D/3D Digital Twin:</b> Intuitive interactive visualization suitable for non-technical building managers and first responders.",
                table_cell
            ),
            Paragraph(
                "• <b>Simplified Microscopic Collisions:</b> Uses discrete grid capacities and cellular occupancy rather than continuous social-force physics.<br/>"
                "• <b>Cellular Hazard vs. CFD:</b> Fast cellular fire propagation provides real-time speed, but lacks full 3D turbulent Navier-Stokes fluid physics.<br/>"
                "• <b>Perfect Information Assumption:</b> Assumes centralized signage/app guidance; real human panic may lead some occupants to ignore alerts.<br/>"
                "• <b>Floorplan Orientation:</b> Blueprint CV requires clean horizontal/vertical walls; extreme skew or perspective distortion requires manual crop.",
                table_cell
            )
        ]
    ]
    pc_table = Table(pros_cons_data, colWidths=[261, 262])
    pc_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), ACCENT_GREEN),
        ('BACKGROUND', (1,0), (1,0), ACCENT_RED),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BACKGROUND', (0,1), (0,1), colors.HexColor("#F0FDF4")),
        ('BACKGROUND', (1,1), (1,1), colors.HexColor("#FEF2F2")),
    ]))
    story.append(pc_table)

    # ========================================================
    # PAGE 6: VIVA QUESTIONS & ANSWERS
    # ========================================================
    story.append(PageBreak())
    story.append(Paragraph("8. High-Yield Open Day Viva & Visitor Q&A", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=1, spaceAfter=4))

    p_viva_intro = (
        "During the Open Day demonstration, visitors, professors, and industry evaluators will probe architectural, "
        "algorithmic, and mathematical design decisions. Below are 8 high-yield questions with authoritative, concise defense answers:"
    )
    story.append(Paragraph(p_viva_intro, body_justify))
    story.append(Spacer(1, 3))

    viva_qa = [
        ("Q1: Why did you choose Graph Theory over Social Force / Continuum Crowd Dynamics?",
         "While Helbing's Social Force Model provides microscopic particle collisions, it scales quadratically (O(N²)) and cannot compute global multi-floor routing in real time. Our discrete topological graph (G = (V, E)) discretizes walkable space into an 8-neighbor Moore grid. This allows us to run Reverse Multi-Source Dijkstra flow fields in milliseconds, enabling real-time multi-horizon optimization for hundreds of occupants simultaneously while enforcing SFPE door capacity bounds."),

        ("Q2: How does Algorithm D prevent path thrashing (the 'ping-pong' oscillation effect)?",
         "If an algorithm re-routes agents purely based on instantaneous queues, agents oscillate back and forth between two exits as queue depths fluctuate. Algorithm D mitigates this using two mathematical mechanisms: (1) Predictive load forecasting (t + τ) which models future arrival times rather than instantaneous spikes, and (2) Rerouting Hysteresis: an agent's path is only invalidated if the new route delivers a cost improvement exceeding a defined threshold (ΔCost > ε_threshold)."),

        ("Q3: How are multi-story vertical stairwells linked between different floors?",
         "In our spatial graph generator, stairs are modeled as specialized 3D shaft edges connecting a stair landing node on Floor k (x, y, z) to Floor k-1 (x, y, z-1). These vertical edges possess a higher traversal cost corresponding to the NFPA/SFPE standard stair descent velocity factor of 0.6x horizontal corridor speed, preventing artificial rushes into stairwells."),

        ("Q4: What is the practical value of Tarjan's Bridge-Finding algorithm in building safety?",
         "Tarjan's algorithm runs in linear time O(|V| + |E|) to identify cut-vertices (articulation nodes) and bridge edges. In building architecture, an articulation point represents a critical choke point—such as a single corridor connecting an entire classroom wing to the main lobby. By flagging these points during layout creation, architects can install secondary fire doors or redesign floor plans before construction."),

        ("Q5: Why do you compute Reverse Multi-Source Dijkstra instead of Forward A* for each agent?",
         "In forward A*, if there are 200 agents, the system must execute 200 separate search passes per tick. In our system, all exit nodes act as origin sources in a single Reverse Dijkstra pass. This generates a global potential flow-field across the entire graph in one shot (O(|E| + |V| log |V|)). Every agent simply steps along the steepest downward gradient of this flow-field, reducing computational load by over 95%."),

        ("Q6: How does the Computer Vision engine turn a hand-drawn or raster blueprint into a metric graph?",
         "The CV engine takes a PNG/JPG raster image and applies: (1) Gaussian adaptive thresholding to binarize walls regardless of lighting, (2) Horizontal and vertical morphological kernels to isolate straight structural lines from furniture noise, (3) Probabilistic Hough Line Transform to detect wall segments, and (4) Contour hierarchy extraction to detect closed room boundaries and door openings. These pixels are then scaled to real-world meters using a pixel-to-meter calibration factor."),

        ("Q7: Why do you use the Vogel Golden Spiral algorithm for post-exit assembly?",
         "In many simulations, evacuated agents either freeze at exit doors (creating unrealistic blockages) or disappear into thin air. In our digital twin, evacuated agents transition to the exterior muster zone. Using Vogel's phyllotaxis formula (r = c√k, θ = k · 137.508°), evacuees fill the assembly area in a dense, uniform, circular packing that mimics real emergency assembly protocols."),

        ("Q8: How can this digital twin be deployed in a real physical smart building?",
         "Our FastAPI backend is designed for direct IoT sensor integration. Real-world thermal/optical smoke detectors can inject live ignition nodes via REST/MQTT into the Hazard Engine, while overhead camera crowd counters (or BLE smartphone beacons) feed live door queue lengths into Algorithm D. The computed exit guidance can then be pushed to dynamic digital exit signage and smart building mobile applications.")
    ]

    for q, a in viva_qa:
        q_box = [
            [Paragraph(q, q_style)],
            [Paragraph(a, a_style)]
        ]
        t = Table(q_box, colWidths=[523])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
            ('BACKGROUND', (0,1), (-1,1), colors.white),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
            ('LINELEFT', (0,0), (0,0), 3, ACCENT_BLUE),
            ('TOPPADDING', (0,0), (-1,-1), 2.2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2.2),
        ]))
        story.append(t)
        story.append(Spacer(1, 3))

    doc.build(story, canvasmaker=NumberedCanvas)
    print("Successfully built perfected PDF!")

if __name__ == '__main__':
    build_pdf()
