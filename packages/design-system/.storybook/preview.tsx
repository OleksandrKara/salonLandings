import type { Preview } from "@storybook/react";
import "../src/tokens/tokens.css";

// Every story renders inside a tenant theme wrapper — the design system carries no color of
// its own outside a theme (see tokens.css). mani is the default since that's the tenant this
// package exists for today; switch the class here (or add a toolbar addon) once a second
// tenant's stories need their own default.
const preview: Preview = {
  decorators: [
    (Story) => (
      <div className="theme-mani" style={{ padding: 24, background: "var(--ds-bg)", minHeight: "100vh" }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
