import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@measured/puck", () => ({
	Puck: () => <div data-testid="puck" />,
}));

import Page from "../app/puck/page";

describe("Puck editor page", () => {
	it("renders heading and puck editor", () => {
		render(<Page />);
		expect(
			screen.getByRole("heading", { name: /puck editor/i }),
		).toBeInTheDocument();
		expect(screen.getByTestId("puck")).toBeInTheDocument();
	});
});
