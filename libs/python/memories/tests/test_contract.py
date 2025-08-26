from brainwav_memories.models import Memory, Provenance


def test_memory_model_roundtrip():
    m = Memory(
        id="1",
        kind="note",
        text="hello",
        tags=["t"],
        createdAt="2024-01-01T00:00:00Z",
        updatedAt="2024-01-01T00:00:00Z",
        provenance=Provenance(source="system"),
    )
    d = m.model_dump()
    assert d["id"] == "1"
    assert d["kind"] == "note"

