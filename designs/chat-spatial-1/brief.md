# Design Brief: Verxa AI "Spatial Intelligence" Chat Experience

## Objective
Elevate the `/chat` interface from a "glass surface" to a "spatial environment." The goal is to mimic the immersive, fluid, and high-tech feel of Gemini, incorporating 3D depth, dynamic lighting, and "living" animations that make the AI feel present and intelligent.

## Target Audience
Users who want a cutting-edge, futuristic AI experience that feels less like a website and more like a sophisticated software application.

## Aesthetic Direction: "Spatial Intelligence"
The design should move beyond flat glass into a 3D environment:
- **The Void (Background)**: Instead of a static gradient, use an **Animated 3D Mesh Gradient**. This is a fluid, organic background where colors shift and flow in a way that suggests volume and depth.
- **Holographic Materiality**:
    - Elements should use "Holographic Glass"—translucent surfaces with a subtle "iridescent" shift as they move or are hovered over.
    - Use CSS `perspective` and `rotateX/Y` to give messages a slight 3D tilt, making them feel like they are floating in space.
- **Neural Shimmer**: Implement a "Gemini-style" animated gradient shimmer. This shimmer should flow across the AI's response container during generation, creating a visual "pulse" of intelligence.
- **Cursor-Aware Lighting**: A soft, luminous glow that follows the user's cursor, illuminating the "glass" surfaces as the mouse moves over them.

## Content Structure & Key Elements
1.  **The Spatial Stage**:
    - A full-screen, animated mesh background that creates a sense of infinite depth.
    - A "Depth Layer" system: Background $\rightarrow$ Ambient Glow $\rightarrow$ Chat Thread $\rightarrow$ Floating Command Center.
2.  **The Floating Thread**:
    - **Messages**: 
        - Instead of simple bubbles, use "Spatial Slabs"—translucent panels with a slight 3D lift (`translateZ`).
        - **User**: A sharp, holographic panel.
        - **AI**: A softer, deep-glow panel with the "Neural Shimmer" animation during streaming.
    - **Transitions**: Messages should not just "rise," but "materialize" using a combination of scale, blur, and a 3D rotation from the Z-axis.
3.  **The Command Center (Composer)**:
    - A floating "Control Pod" at the bottom.
    - The input field should have a "glow-ring" that intensifies as the user types.
    - The transition to Image/Video mode should be a "morphing" animation, where the pod expands or shifts shape.

## Typography & Color
- **Typography**:
    - High-contrast **Inter** for content.
    - **Geist Mono** for "system" data, labels, and technical info.
    - Use a very light weight for body text to maintain a "futuristic" and airy feel.
- **Colors**:
    - Base: Deepest obsidian (`#020204`).
    - Accents: A dynamic palette of "Neural Blue" (`#8ea4ff`), "Deep Violet" (`#a855f7`), and "Cyan Glow" (`#22d3ee`).
    - Gradients: Mesh gradients blending these three colors.

## Technical Requirements
- **Framework**: Next.js (App Router).
- **Styling**: Tailwind CSS + advanced CSS animations (Keyframes for mesh, Perspective for 3D).
- **Components to Redesign**:
    - `src/components/chat/message-list.tsx`
    - `src/components/chat/composer.tsx`
    - `src/components/chat/model-picker.tsx`
    - `src/app/chat/page.tsx` and `src/app/chat/[id]/page.tsx`
- **Output Path**: Respect the existing project structure.

## Animation Requirements
- **Mesh Flow**: A slow, organic shifting of background colors (e.g., using a large blurred SVG or multiple radial gradients).
- **3D Tilt**: Use a small JS hook or CSS hover effect to tilt panels slightly toward the cursor.
- **The Shimmer**: A linear-gradient animation that moves from left to right across the AI message block.
