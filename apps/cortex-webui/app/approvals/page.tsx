"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../utils/api-client";

type ApprovalItem = { id: string; node?: string; proposal?: unknown };

export default function Approvals() {
	const [items, setItems] = useState<ApprovalItem[]>([]);

	useEffect(() => {
		apiFetch<ApprovalItem[]>("/api/approvals")
			.then(setItems)
			.catch(console.error);
	}, []);

	async function decide(id: string, approved: boolean) {
		await apiFetch("/api/approvals", {
			method: "POST",
			body: JSON.stringify({ id, approved }),
		});
		setItems((xs) => xs.filter((x) => x.id !== id));
	}

	return (
		<main className="p-4">
			<h1 className="text-xl">Approvals</h1>
			<ul>
				{items.map((it) => (
					<li key={it.id} className="border rounded p-2 my-2">
						<div className="font-semibold">{it.node}</div>
						<pre className="overflow-auto max-h-64">
							{JSON.stringify(it.proposal, null, 2)}
						</pre>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => decide(it.id, true)}
								aria-label="Approve"
							>
								Approve
							</button>
							<button
								type="button"
								onClick={() => decide(it.id, false)}
								aria-label="Reject"
							>
								Reject
							</button>
						</div>
					</li>
				))}
			</ul>
		</main>
	);
}
