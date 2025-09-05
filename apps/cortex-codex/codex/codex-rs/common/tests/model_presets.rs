use codex_common::model_presets::ModelPreset;
use codex_common::model_presets::builtin_model_presets;
use pretty_assertions::assert_eq;

#[test]
fn builtin_presets_include_provider_ids() {
    let presets: &[ModelPreset] = builtin_model_presets();
    assert!(presets.iter().all(|p| !p.provider_id.is_empty()));
    assert_eq!(presets[0].provider_id, "openai");
}
