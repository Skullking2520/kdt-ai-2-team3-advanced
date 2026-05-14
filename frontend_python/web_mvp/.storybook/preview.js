import "../src/styles.css";

export const parameters = {
  backgrounds: {
    default: "app",
    values: [
      { name: "app", value: "hsl(210 40% 98%)" },
      { name: "white", value: "#ffffff" },
    ],
  },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/i,
    },
  },
};
