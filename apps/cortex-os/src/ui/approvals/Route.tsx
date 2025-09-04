import { useEffect, useState } from "react";

/* A11y:
  - role="list" / "listitem"
  - aria-live="polite" for updates
  - Keyboard: ? help, Enter accept, Esc cancel, g/G next/prev
*/
type Item = { id?: string; node?: string; proposal?: unknown };

export default function Approvals() {
	const [items] = useState<Item[]>([]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "?")
				alert("Shortcuts: Enter accept, Esc reject, g next, G prev");
			if (e.key === "Enter") approve();
			if (e.key === "Escape") reject();
			// navigation keys intentionally disabled until selection state is reintroduced
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [items]);

	function approve() {
		/* POST decision */
	}
	function reject() {
		/* POST decision */
	}

	return (
                <section aria-label="Pending approvals">
                        <div aria-live="polite" />
                        <p id="list-desc" className="sr-only">
                                List of proposals awaiting approval
                        </p>
                        <ul aria-describedby="list-desc">
                                {items.map((it) => (
                                        <li key={it.id}>
						<h3>{it.node} proposal</h3>
						<pre>{JSON.stringify(it.proposal, null, 2)}</pre>
						<button
							type="button"
							onClick={approve}
							aria-label="Approve proposal"
						>
							Approve
						</button>
						<button type="button" onClick={reject} aria-label="Reject proposal">
							Reject
						</button>
					</li>
				))}
			</ul>
		</section>
	);
}
