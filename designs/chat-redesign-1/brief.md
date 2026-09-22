# Design Brief: Verxa AI Chat Interface Redesign

## Objective
Transform the `/chat` experience from a functional AI interface into a "Cognitive Workspace." The goal is to create an environment of absolute focus, clarity, and premium feel, evolving the "Luminous Precision" aesthetic into a specific "Cognitive Clarity" mode for the application.

## Target Audience
- Users who spend hours in deep thought, writing, or coding with AI.
- Power users who frequently switch models and use plugins.
- People who associate "Premium" with minimalism, depth, and precision.

## Aesthetic Direction: "Cognitive Clarity"
An evolution of "Luminous Precision" optimized for long-term interaction:
- **Immersive Depth**: The entire chat interface should feel like it's floating on a deep, luminous stage. Use the `glass-stage` and `glass-grain` primitives to create a "void" that reduces eye strain and increases focus.
- **Materiality (Liquid Glass)**: Move away from flat colors to a comprehensive "Liquid Glass" system. 
    - **User Messages**: "Specular Glass" — high transparency, sharp specular highlights (`glass-spec`), feeling like a polished crystal.
    - **AI Messages**: "Frosted Depth" — slightly more opaque, heavier blur, feeling like a solid yet translucent slab of frosted glass.
- **Precision Layout**: Extreme attention to spacing. Messages should not feel crowded. Use a generous `max-w` for the chat thread to prevent long line lengths.
- **Fluid Transitions**: Every interaction (switching models, sending messages, opening plugins) should use the "liquid" animations (`animate-lx-rise`, `animate-lx-bubble`) to feel organic and high-end.

## Content Structure & Key Elements
1.  **The Stage (Root)**:
    - Wrap the entire chat experience in the `glass-root` and `glass-stage`.
    - Ensure the background is a calming, deep void with slow-drifting luminous orbs.
2.  **The Header (Control Plane)**:
    - Refine the `topBar`.
    - The `ModelPicker` should not just be a dropdown but a "Model Identity" element. When a model is selected, its name and "persona" should be clearly visible and feel like a premium toggle.
3.  **The Conversation (The Thread)**:
    - **Message Blocks**: 
        - User messages: Right-aligned, Specular Glass, sharp edges, high contrast.
        - AI messages: Left-aligned, Frosted Glass, softer edges, integrate `markdown-body` with high legibility.
    - **Media Integration**: `MediaCard` and `FlightCards` should be fully integrated into the glass aesthetic, appearing as embedded "sub-panels" within the AI's response.
    - **Status Line**: The "Thinking..." status should be an elegant, pulsing element that doesn't disrupt the flow.
4.  **The Command Center (Composer)**:
    - The `Composer` should be the anchor of the experience.
    - Refine the "input pill" to feel like a high-precision tool.
    - **Plugin Interaction**: The plugin dropdown should be a "Glass Panel" that slides in with a liquid motion, using `glass-float` styling.
    - **Media Modes**: Transitions to Image/Video mode should be seamless, with the "mode banner" feeling like a floating HUD element.

## Typography & Color
- **Typography**:
    - Use **Inter** for the main conversation and **Geist Mono** for technical data, code, and model IDs.
    - Focus on "Light" and "Regular" weights to maintain an airy feel.
- **Colors**:
    - Background: `--lx-stage` (#040407).
    - Accents: `--accent` and `--accent-strong` for primary interactions and identity.
    - Glass: Full use of the `glass-root` palette (fills, edges, speculars).

## Technical Requirements
- **Framework**: Next.js (App Router).
- **Styling**: Tailwind CSS + the `globals.css` "Liquid Glass" system.
- **Components to Redesign**:
    - `src/components/chat/message-list.tsx` (The core conversation)
    - `src/components/chat/composer.tsx` (The command center)
    - `src/app/chat/page.tsx` and `src/app/chat/[id]/page.tsx` (The page shells)
    - `src/components/chat/model-picker.tsx` (The control plane)
- **Output Path**: The respective component and page files.

## Image Needs
Since the chat is an interface, focus on the *materiality* of the glass. Use CSS gradients and blurs to simulate depth rather than external assets. Ensure any simulated "media" in the chat follows the high-end aesthetic of the landing page.
