// page.tsx (Next 14+ App Router)
import { useEffect, useRef, useState } from "react";

export default function Map() {
  const [data,setData]=useState<{nodes:any[];links:any[]}>({nodes:[],links:[]});
  const ref = useRef<HTMLDivElement>(null);

  useEffect(()=>{ (async()=>{
    const cm = await fetch("/api/context-map").then(r=>r.json());
    const nodes = cm.files.map((f:any)=>({ id:f.path, label:f.path.split("/").pop() }));
    const links:any[] = []; // derive from imports/exports if present
    setData({nodes,links});
  })(); },[]);

  return (
    <main className="p-4">
      <h1 className="text-xl" aria-live="polite">Repo Map</h1>
      <div ref={ref} role="figure" aria-label="Dependency graph" className="border rounded-2xl p-2 min-h-96" />
      <p className="sr-only">Use Tab to navigate nodes. Press Enter to open details.</p>
    </main>
  );
}
