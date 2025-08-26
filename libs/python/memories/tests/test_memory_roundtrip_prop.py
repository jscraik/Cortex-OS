from brainwav_memories.models import Memory, Provenance
from hypothesis import given
from hypothesis import strategies as st


@given(
    id=st.text(min_size=1, max_size=10),
    kind=st.sampled_from(["note", "event", "artifact", "embedding"]),
    text=st.one_of(st.none(), st.text(max_size=20)),
    tags=st.lists(st.text(max_size=5), max_size=5),
)
def test_memory_roundtrip_prop(id: str, kind: str, text: str | None, tags: list[str]) -> None:
    m = Memory(
        id=id,
        kind=kind,
        text=text,
        tags=tags,
        createdAt="2024-01-01T00:00:00Z",
        updatedAt="2024-01-01T00:00:00Z",
        provenance=Provenance(source="system"),
    )
    assert Memory(**m.model_dump()) == m  # noqa: S101
