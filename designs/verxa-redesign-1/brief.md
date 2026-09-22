# Design Brief: Verxa AI Landing Page Redesign

## Objective
Modernize and elevate the Verxa AI landing page to reflect its persona as a "calm, precise AI assistant." The goal is to move from a "generic AI tool" look to a "premium, high-end utility" feel. The page must drive immediate usage through the live chat bar and showcase the creative power of Barada Studio.

## Target Audience
- Power users seeking a precise, multi-model AI interface.
- Creatives looking for a streamlined image/video generation workspace.
- Users who value a "calm" and "uncluttered" digital environment.

## Aesthetic Direction: "Luminous Precision"
The design should be a masterclass in dark-mode minimalism, characterized by:
- **Depth through Light**: Use the existing "Design System v2" (elevated cards, aurora backgrounds) but with more intentionality. No "rainbow blobs"; instead, use ethereal, soft-focus glows that feel like light passing through frosted glass.
- **High-Contrast Precision**: Stark contrast between deep blacks (`--bg: #08090c`) and the accent blue (`--accent: #8ea4ff`).
- **Airy Composition**: Increase whitespace (margins/padding) to create a sense of "calm" and "breathing room."
- **Micro-Interactions**: Subtle, high-quality transitions (using `hover-lift` and `animate-item-rise`) that make the interface feel responsive and "liquid."

## Content Structure
1.  **Hero Section**:
    - **Header**: Minimalist `MarketingHeader`.
    - **Centerpiece**: High-impact headline ("Think clearer with Verxa") and a light, airy sub-headline.
    - **The Hook**: The live `Composer` chat bar must be the focal point. It should feel like a portal into the app.
    - **Context**: Small, faint text indicating sign-in status or free message limit.
2.  **Barada Studio Showcase**:
    - A high-impact, full-width or large-card section.
    - **Visuals**: Show a "gallery" of capabilities (Image Gen, Edit, Video) using high-quality, precise placeholders.
    - **CTA**: "Open Barada Studio" button with a strong, focused style.
3.  **Core Features Grid**:
    - 4-column or 2x2 grid highlighting:
        - 8+ Models (Multi-model flexibility)
        - Live Web Search (Real-time accuracy)
        - End-to-End Sync (Seamless access)
        - Multilingual precision (Global reach)
    - Use the `bg-card` and `hover-lift` patterns.
4.  **The "Brain" Section (Model Strip)**:
    - An elegant section explaining the ability to switch models per chat.
    - Emphasis on "Pick the brain for the job."
5.  **Final CTA**:
    - Simple, powerful call to action to start chatting or explore the studio.
    - `MarketingFooter`.

## Typography & Color
- **Typography**: Use the project's Inter and Geist Mono.
    - Headings: `display-1` and `display-2` for strong, confident statements.
    - Body: `text-muted` for descriptions, `text-faint` for secondary info. Use light font weights for a "modern" feel.
- **Colors**: 
    - Primary: `--bg` and `--bg-elevated`.
    - Accents: `--accent` for primary actions, `--accent-soft` for subtle highlights.
    - Glows: Use `--glow` and the `hero-aurora` patterns to create atmosphere.

## Technical Requirements
- **Framework**: Next.js (App Router).
- **Styling**: Tailwind CSS + the existing `globals.css` design system.
- **Components**: Reuse `VerxaMark`, `Composer`, `MarketingHeader`, `MarketingFooter`.
- **Output Path**: `src/app/page.tsx`.

## Image Needs
The implementer should create visually stunning, high-precision placeholders for the Studio section. 
- One photorealistic interior or landscape.
- One conceptual art piece.
- One frame that looks like a video still.
- These should be integrated as clean, high-quality assets.
