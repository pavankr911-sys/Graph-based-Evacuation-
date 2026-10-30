# Video Demonstration Script: Intelligent Emergency Evacuation Digital Twin
**Target Duration:** 1.5 to 2.0 Minutes (90–120 Seconds)  
**Audience:** Faculty Members, Project Evaluators & Academic Reviewers  
**Purpose:** High-impact showcase of system architecture, 2D/3D digital twin visualizer, spatial graph engine, and comparative routing algorithms.

---

## 📋 Pre-Recording Preparation Checklist

1. **Resolution & Display:** Set browser to 1080p (1920×1080) and press `F11` for clean full-screen recording without distracting browser tabs.
2. **Pre-Loaded Data:**
   - Ensure the backend FastAPI server (`localhost:8000`) and Next.js frontend (`localhost:3000`) are running.
   - Pre-load a sample building (e.g., the multi-room "Academic Building") with a generated graph.
   - Run one "Head-to-Head Race" beforehand so results are instant and available in the *Simulations* tab.
3. **Cursor & Audio:** Use a clear microphone with steady volume. Move the mouse smoothly to guide the faculty's attention.

---

## 🎬 Scene-by-Scene Script & Action Guide

### **Scene 1: Introduction & Research Problem**
- **Timestamp:** `0:00 – 0:18` (18s)
- **Screen View:** Starting on the **Dashboard** / Hero view (`/`), showing the active buildings and system telemetry.
- **Visual Action:**
  - Start on Dashboard.
  - Hover over the stats cards (Total Buildings, Simulations Run).
  - Transition smoothly by clicking into the **Building Editor**.
- **Voiceover Script:**
  > *"Respected faculty members, welcome to the demonstration of our project: the **Intelligent Emergency Evacuation Digital Twin**.*
  > 
  > *During indoor emergencies, conventional exit signs guide people to the nearest static exit. This causes severe crowd bottlenecks and routes evacuees directly toward propagating hazards. Our research-backed digital twin solves this by computing dynamic, hazard-aware, and predictive load-balanced evacuation paths in real time."*

---

### **Scene 2: Spatial Graph & 2D/3D Digital Twin Modeling**
- **Timestamp:** `0:18 – 0:45` (27s)
- **Screen View:** **Building Editor** (`/editor?buildingId=...`)
- **Visual Action:**
  - Show the 2D layout with rooms, corridors, doors, and exits.
  - Click **"Show Graph"** (or point to navigation graph nodes and edges overlaying the floor plan).
  - Click the **3D View Toggle** to show the React-Three-Fiber isometric 3D building model; rotate smoothly for 3 seconds, then switch back to 2D.
- **Voiceover Script:**
  > *"Here in the Editor, our platform models complex multi-floor infrastructures. The floor plan automatically generates a topological navigation graph, where nodes represent rooms, hallways, and portals, while edges represent traversable paths.*
  > 
  > *With a single toggle, the platform transforms into a 3D Digital Twin rendered with Three.js, allowing safety personnel and building managers to inspect multi-level spatial layouts from any vantage point."*

---

### **Scene 3: Scenario Configurator & 4-Algorithm Benchmark Race**
- **Timestamp:** `0:45 – 1:12` (27s)
- **Screen View:** **Scenario Configurator** (`/scenarios`)
- **Visual Action:**
  - Navigate to `/scenarios`.
  - Highlight the **"Head-to-Head Race"** tab.
  - Briefly point to the parameter sliders: Occupant Count (e.g., 30–50 agents), Hazard Spread Rate, and the 4 Algorithms:
    - *Algorithm A: Static Shortest Path (Baseline A\*)*
    - *Algorithm B: Safety-Aware A\**
    - *Algorithm C: Real-Time Load-Aware A\**
    - *Algorithm D: Proposed Dynamic Safety + Predictive Load Rerouting*
  - Click **"Launch Comparative Race"** (or navigate to pre-computed results).
- **Voiceover Script:**
  > *"In the Scenario Configurator, we benchmark evacuation performance under identical initial conditions across four algorithms:*
  > *Algorithm A is our static baseline; Algorithm B introduces real-time hazard avoidance; Algorithm C penalizes instantaneous door congestion; and Algorithm D—our proposed system—uses predictive exit load forecasting and hazard risk weighting.*
  > 
  > *Let's launch the Head-to-Head Race to evaluate real-time agent distribution and evacuation efficiency."*

---

### **Scene 4: Live Simulation Playback & Exit Intelligence**
- **Timestamp:** `1:12 – 1:42` (30s)
- **Screen View:** **Simulation Playback** (`/editor?simId=...`)
- **Visual Action:**
  - Hit **Play** on the timeline scrubber.
  - Show heterogeneous agents (color-coded dots for adults, elderly, mobility-impaired) moving through corridors toward exits.
  - Scrub the timeline slider forward and back to show smooth frame-by-frame discrete event telemetry.
  - Highlight the **Exit Intelligence HUD** on the right side showing real-time queue lengths, flow discharge rates, and exit utilization balancing.
- **Voiceover Script:**
  > *"Here is the live simulation running. Notice our heterogeneous agent population—modeling adults, children, and mobility-impaired individuals with individualized walking speeds and reaction delays.*
  > 
  > *Under our proposed Algorithm D, as an exit begins to congest, agents dynamically re-route toward underutilized alternatives before severe crush bottlenecks form.*
  > 
  > *On the right, the Exit Intelligence HUD streams real-time queue depths and door capacities, demonstrating how proactive load balancing prevents deadly stampedes."*

---

### **Scene 5: Comparative Analytics & Faculty Conclusion**
- **Timestamp:** `1:42 – 2:00` (18s)
- **Screen View:** **Simulations & Analytics Page** (`/simulations`)
- **Visual Action:**
  - Show the comparative bar charts and metrics table:
    - Total Evacuation Time (TET) reduction.
    - Zero trapped agents / reduced hazard exposure.
    - Evacuation curve comparison chart.
  - End on a strong summary view with the winning metric badge.
- **Voiceover Script:**
  > *"Finally, our analytics dashboard proves the hypothesis: Algorithm D consistently achieves a significant reduction in Total Evacuation Time, eliminates exit stampedes, and minimizes cumulative toxic hazard exposure.*
  > 
  > *This digital twin bridges academic graph theory with real-world architectural safety and smart building automation. Thank you for your time, and we look forward to your valuable feedback and questions!"*

---

## 📊 Summary Breakdown Table

| Time | Scene | On-Screen Action | Key Talking Point |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:18** | Title & Dashboard | Dashboard metrics overview; transition to Editor | Academic problem statement: static routing vs dynamic hazards |
| **0:18 – 0:45** | 2D/3D Digital Twin | Show 2D floorplan, graph overlay, toggle 3D model | Automatic topological graph extraction & 3D visualization |
| **0:45 – 1:12** | Scenario Configurator | Highlight 4 algorithms, agent slider, start Head-to-Head Race | Rigorous algorithmic comparison (Algo A vs B vs C vs D) |
| **1:12 – 1:42** | Live Simulation | Play simulation, scrub timeline, point out Exit HUD | Heterogeneous crowd demographics & dynamic rerouting |
| **1:42 – 2:00** | Results & Conclusion | Comparative graphs (TET reduction, zero casualties) | Empirical research validation and closing thank you |

---

## 💡 Quick Tips for Recording
- **Pacing:** Speak calmly and clearly. Do not rush—110 to 130 words per minute sounds confident and authoritative.
- **Mouse Movement:** Move the cursor deliberately. Avoid rapid shaking or circles around buttons.
- **Editing Tool:** You can record using OBS Studio, Windows Game Bar (`Win + G`), or Loom, and easily trim start/end pauses.

