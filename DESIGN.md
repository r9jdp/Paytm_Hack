# DESIGN

## Visual System

### Brand Strategy
Product-first dashboard style with restrained color treatment and high-information density. Emphasis is on trust, speed, and clear state communication.

## Color

- Primary surface: dark ink/charcoal for headings and primary structure.
- Page background: cool, near-white neutral.
- Surface: white cards with subtle borders.
- Accent: deep teal used only for key actions and status.
- Success: muted green.
- Warning: soft amber.
- Error: muted red.

## Typography

- Primary font: Inter.
- Scale is controlled and dense for workflow screens.
- h1 is bold but restrained, with `text-wrap: balance`.
- Body copy uses 16px base with generous line height.

## Layout

- A shared two-column structure on large screens for dashboards.
- Onboarding/workflow panel on the right and media/status on the left.
- Mobile: single column, progressive collapse, and preserved action visibility.

## Spacing and Rhythm

- Use 8 px/0.5 rem baseline units.
- Cards and panels use consistent padding and gutters.
- Status strips and badges sit close to related controls.

## Interaction States

- Every actionable control includes default, hover, focus-visible, disabled, and loading states.
- Loading and in-progress states are visualized on each critical workflow step.
- Error states should include a short remedy phrase.

## Components

- Shared button language: primary, secondary, icon, and ghost states.
- Panels use borders and muted shadows for depth without over-styling.
- Cards avoid aggressive borders and avoid nested card nesting.

## Motion

- Use subtle state transitions only, 150-250ms.
- Avoid decorative motion and auto-play sequences.
- Respect reduced motion preference.
