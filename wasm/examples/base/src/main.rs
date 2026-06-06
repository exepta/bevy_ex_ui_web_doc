use bevy::asset::AssetMetaCheck;
use bevy::prelude::*;
use bevy_extended_ui::html::{HtmlChange, HtmlEvent, HtmlSource, HtmlSubmit};
use bevy_extended_ui::io::{CssAsset, HtmlAsset};
use bevy_extended_ui::registry::UiRegistry;
use bevy_extended_ui::styles::CssID;
use bevy_extended_ui::widgets::{
    Button as UiButton, ChoiceBox, ColorPicker, FieldSelectionMulti, FieldSelectionSingle,
    Headline, InputValue, ProgressBar, RadioButton, Scrollbar, Slider, ToggleButton,
    UIWidgetState,
};
use bevy_extended_ui::{ExtendedUiConfiguration, ExtendedUiPlugin};
use bevy_extended_ui_macros::html_fn;
use std::collections::HashMap;

#[cfg(target_arch = "wasm32")]
use web_sys::{window, UrlSearchParams};

#[derive(Resource, Debug, Clone)]
struct RuntimeExampleConfig {
    id: String,
    html: String,
    css: String,
    theme: DemoTheme,
}

#[derive(Resource, Debug, Clone)]
struct RuntimeHtmlHandle(Handle<HtmlAsset>);

#[derive(Resource, Debug, Default)]
struct RuntimeUiActivated(bool);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum DemoTheme {
    Light,
    Dark,
}

impl DemoTheme {
    fn resolve() -> Self {
        #[cfg(target_arch = "wasm32")]
        {
            if let Some(win) = window() {
                if let Ok(search) = win.location().search() {
                    if let Ok(params) = UrlSearchParams::new_with_str(&search) {
                        if let Some(value) = params.get("theme") {
                            let normalized = value.trim().to_ascii_lowercase();
                            if normalized == "light" {
                                return Self::Light;
                            }
                            if normalized == "dark" {
                                return Self::Dark;
                            }
                        }
                    }
                }
            }
        }

        Self::Dark
    }
}

fn parse_query_param(name: &str) -> Option<String> {
    #[cfg(target_arch = "wasm32")]
    {
        let win = window()?;
        let search = win.location().search().ok()?;
        let params = UrlSearchParams::new_with_str(&search).ok()?;
        return params.get(name);
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        let _ = name;
        None
    }
}

fn normalize_example_markup(markup: String, example_id: &str) -> String {
    let trimmed = markup.trim();
    if trimmed.is_empty() {
        return format!(
            "<div><headline>{example_id}</headline><paragraph>No html configured in wasm_examples.json.</paragraph></div>"
        );
    }

    let normalized = replace_known_markup_placeholders(trimmed);
    let normalized = rewrite_attr_prefix(&normalized, "icon", "icons/", "examples/icons/");
    let normalized = rewrite_src_prefix_in_tag(&normalized, "icon", "icons/", "examples/icons/");
    rewrite_src_prefix_in_tag(&normalized, "img", "examples/icons/", "icons/")
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PlaceholderAttrContext {
    Icon,
    Src,
    Other,
}

fn placeholder_attr_context(prefix: &str) -> PlaceholderAttrContext {
    let lower = prefix.to_ascii_lowercase();

    if lower.ends_with("icon=\"") || lower.ends_with("icon='") {
        return PlaceholderAttrContext::Icon;
    }

    if lower.ends_with("src=\"") || lower.ends_with("src='") {
        let last_lt = lower.rfind('<');
        let last_gt = lower.rfind('>');
        if let Some(lt) = last_lt {
            if last_gt.map_or(true, |gt| lt > gt) {
                let tag_start = lower[lt + 1..].trim_start();
                if tag_start.starts_with("icon") {
                    return PlaceholderAttrContext::Icon;
                }
            }
        }

        return PlaceholderAttrContext::Src;
    }

    PlaceholderAttrContext::Other
}

fn replace_known_markup_placeholders(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut rest = value;

    loop {
        let Some(start) = rest.find('{') else {
            output.push_str(rest);
            break;
        };

        output.push_str(&rest[..start]);
        let after_open = &rest[start + 1..];

        let Some(end_rel) = after_open.find('}') else {
            output.push_str(&rest[start..]);
            break;
        };

        let token = &after_open[..end_rel];
        let replacement = match token.trim().to_ascii_lowercase().as_str() {
            "custom.png" => match placeholder_attr_context(&output) {
                PlaceholderAttrContext::Icon => "examples/icons/custom.png",
                PlaceholderAttrContext::Src | PlaceholderAttrContext::Other => "icons/custom.png",
            },
            "example_image" => match placeholder_attr_context(&output) {
                PlaceholderAttrContext::Icon => "examples/bevy.png",
                PlaceholderAttrContext::Src | PlaceholderAttrContext::Other => "bevy.png",
            },
            _ => {
                output.push('{');
                output.push_str(token);
                output.push('}');
                rest = &after_open[end_rel + 1..];
                continue;
            }
        };

        output.push_str(replacement);
        rest = &after_open[end_rel + 1..];
    }

    output
}

fn rewrite_attr_prefix(value: &str, attr_name: &str, from_prefix: &str, to_prefix: &str) -> String {
    value
        .replace(
            &format!("{attr_name}=\"{from_prefix}"),
            &format!("{attr_name}=\"{to_prefix}"),
        )
        .replace(
            &format!("{attr_name}='{from_prefix}"),
            &format!("{attr_name}='{to_prefix}"),
        )
}

fn rewrite_src_prefix_in_tag(
    value: &str,
    tag_name: &str,
    from_prefix: &str,
    to_prefix: &str,
) -> String {
    let mut output = String::with_capacity(value.len());
    let mut rest = value;
    let open_tag = format!("<{tag_name}");

    loop {
        let lower_rest = rest.to_ascii_lowercase();
        let Some(start) = lower_rest.find(&open_tag) else {
            output.push_str(rest);
            break;
        };

        output.push_str(&rest[..start]);
        rest = &rest[start..];

        let Some(end) = rest.find('>') else {
            output.push_str(rest);
            break;
        };

        let tag = &rest[..=end];
        let rewritten = tag
            .replace(
                &format!("src=\"{from_prefix}"),
                &format!("src=\"{to_prefix}"),
            )
            .replace(
                &format!("src='{from_prefix}"),
                &format!("src='{to_prefix}"),
            );
        output.push_str(&rewritten);
        rest = &rest[end + 1..];
    }

    output
}

fn set_css_declaration(declarations: &mut Vec<String>, property: &str, value: &str) {
    let prefix = format!("{property}:");
    declarations.retain(|entry| !entry.starts_with(&prefix));
    declarations.push(format!("{prefix}{value}"));
}

fn normalize_container_css(css: String) -> String {
    let mut declarations = Vec::new();
    let normalized_input = css.replace('+', " ");
    set_css_declaration(&mut declarations, "display", "flex");
    set_css_declaration(&mut declarations, "flex-direction", "column");
    set_css_declaration(&mut declarations, "gap", "12px");
    set_css_declaration(&mut declarations, "justify-content", "flex-start");
    set_css_declaration(&mut declarations, "align-items", "flex-start");

    for token in normalized_input.split(',') {
        let normalized = token.trim().trim_start_matches('+').trim();
        if normalized.is_empty() {
            continue;
        }

        let lower = normalized.to_ascii_lowercase();

        if lower == "column" {
            set_css_declaration(&mut declarations, "display", "flex");
            set_css_declaration(&mut declarations, "flex-direction", "column");
            continue;
        }

        if lower == "row" {
            set_css_declaration(&mut declarations, "display", "flex");
            set_css_declaration(&mut declarations, "flex-direction", "row");
            continue;
        }

        if lower == "center" || lower == "center:center" {
            set_css_declaration(&mut declarations, "justify-content", "center");
            set_css_declaration(&mut declarations, "align-items", "center");
            continue;
        }

        if lower == "jc:center" {
            set_css_declaration(&mut declarations, "justify-content", "center");
            continue;
        }

        if lower == "al:center" {
            set_css_declaration(&mut declarations, "align-items", "center");
            continue;
        }

        if lower == "wrap" {
            set_css_declaration(&mut declarations, "flex-wrap", "wrap");
            continue;
        }

        if let Some((raw_key, raw_value)) = normalized.split_once(':') {
            let key = raw_key.trim().trim_start_matches('+').to_ascii_lowercase();
            let value = raw_value.trim().trim_start_matches('+').trim();

            if key.is_empty() || value.is_empty() {
                continue;
            }

            if key == "jc" {
                set_css_declaration(&mut declarations, "justify-content", value);
                continue;
            }

            if key == "al" {
                set_css_declaration(&mut declarations, "align-items", value);
                continue;
            }

            if key == "center" && value.eq_ignore_ascii_case("center") {
                set_css_declaration(&mut declarations, "justify-content", "center");
                set_css_declaration(&mut declarations, "align-items", "center");
                continue;
            }

            set_css_declaration(&mut declarations, &key, value);
        }
    }

    declarations.join("; ")
}

#[cfg(test)]
mod tests {
    use super::{build_runtime_document, normalize_container_css, normalize_example_markup, DemoTheme, RuntimeExampleConfig};

    fn has_declaration(css: &str, property: &str, value: &str) -> bool {
        css.split(';')
            .map(|entry| entry.trim())
            .any(|entry| entry == format!("{property}:{value}"))
    }

    #[test]
    fn supports_comma_separated_layout_shortcuts() {
        let css = normalize_container_css("row, gap:12px, al:center, jc:center".to_string());

        assert!(has_declaration(&css, "display", "flex"));
        assert!(has_declaration(&css, "flex-direction", "row"));
        assert!(has_declaration(&css, "gap", "12px"));
        assert!(has_declaration(&css, "align-items", "center"));
        assert!(has_declaration(&css, "justify-content", "center"));
    }

    #[test]
    fn jc_and_al_only_change_their_respective_axis() {
        let css = normalize_container_css("jc:flex-start, al:flex-start, jc:center".to_string());
        assert!(has_declaration(&css, "justify-content", "center"));
        assert!(has_declaration(&css, "align-items", "flex-start"));

        let css = normalize_container_css("jc:flex-start, al:flex-start, al:center".to_string());
        assert!(has_declaration(&css, "justify-content", "flex-start"));
        assert!(has_declaration(&css, "align-items", "center"));
    }

    #[test]
    fn center_center_sets_both_axis_to_center() {
        let css = normalize_container_css("jc:flex-start, al:flex-start, center:center".to_string());
        assert!(has_declaration(&css, "justify-content", "center"));
        assert!(has_declaration(&css, "align-items", "center"));
    }

    #[test]
    fn al_or_jc_center_does_not_implicitly_center_both_axes() {
        let css = normalize_container_css("al:center".to_string());
        assert!(has_declaration(&css, "align-items", "center"));
        assert!(has_declaration(&css, "justify-content", "flex-start"));

        let css = normalize_container_css("jc:center".to_string());
        assert!(has_declaration(&css, "justify-content", "center"));
        assert!(has_declaration(&css, "align-items", "flex-start"));
    }

    #[test]
    fn ignores_urlencoded_plus_prefixes_from_query_params() {
        let css = normalize_container_css("row,+gap:12px,+al:center,+jc:center".to_string());
        assert!(has_declaration(&css, "flex-direction", "row"));
        assert!(has_declaration(&css, "gap", "12px"));
        assert!(has_declaration(&css, "justify-content", "center"));
        assert!(has_declaration(&css, "align-items", "center"));
    }

    #[test]
    fn replaces_known_image_placeholders() {
        let html = normalize_example_markup(
            "<div><img src=\"{ custom.png }\" /><img src=\"{example_image}\" /></div>".to_string(),
            "example",
        );

        assert!(html.contains("icons/custom.png"));
        assert!(html.contains("bevy.png"));
    }

    #[test]
    fn replaces_icon_attribute_placeholders_with_asset_root_paths() {
        let html = normalize_example_markup(
            "<div><checkbox icon=\"{custom.png}\">A</checkbox><button><icon src=\"{custom.png}\"></icon></button></div>"
                .to_string(),
            "example",
        );

        assert!(html.contains("icon=\"examples/icons/custom.png\""));
        assert!(html.contains("src=\"examples/icons/custom.png\""));
    }

    #[test]
    fn normalizes_examples_icons_prefix_to_relative_icons_path() {
        let html = normalize_example_markup(
            "<div><img src=\"examples/icons/custom.png\" /></div>".to_string(),
            "example",
        );

        assert!(html.contains("src=\"icons/custom.png\""));
        assert!(!html.contains("examples/icons/custom.png"));
    }

    #[test]
    fn keeps_icon_widget_paths_in_examples_icons_scope() {
        let html = normalize_example_markup(
            "<div><button><icon src=\"icons/check-mark.png\"></icon></button><checkbox icon=\"icons/custom.png\">A</checkbox></div>"
                .to_string(),
            "example",
        );

        assert!(html.contains("src=\"examples/icons/check-mark.png\""));
        assert!(html.contains("icon=\"examples/icons/custom.png\""));
        assert!(!html.contains("src=\"icons/check-mark.png\""));
        assert!(!html.contains("icon=\"icons/custom.png\""));
    }

    #[test]
    fn runtime_document_sets_html_theme_attribute() {
        let document = build_runtime_document(&RuntimeExampleConfig {
            id: "example".to_string(),
            html: "<button>Ok</button>".to_string(),
            css: "display:flex".to_string(),
            theme: DemoTheme::Light,
        });

        assert!(document.contains("<html lang=\"en\" data-theme=\"light\">"));
    }
}

fn resolve_runtime_example() -> RuntimeExampleConfig {
    let id = parse_query_param("example")
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "example".to_string());
    let html = normalize_example_markup(parse_query_param("html").unwrap_or_default(), &id);
    let css = normalize_container_css(parse_query_param("css").unwrap_or_default());
    let theme = DemoTheme::resolve();

    RuntimeExampleConfig { id, html, css, theme }
}

fn build_runtime_document(config: &RuntimeExampleConfig) -> String {
    let root_style = config.css.replace('"', "'");
    let theme = match config.theme {
        DemoTheme::Light => "light",
        DemoTheme::Dark => "dark",
    };
    format!(
        r#"<!DOCTYPE html>
<html lang="en" data-theme="{theme}">
<head>
  <meta name="widgets-demo" />
  <meta charset="UTF-8">
  <link rel="stylesheet" href="widget_overview.css" />
  <style>
    html, body, #container {{
      width: 100%;
      height: 100%;
      margin: 0;
    }}
  </style>
</head>
<theme-provider default="{theme}">
  <body>
    <div id="container" class="base-look" style="{root_style}">
      {html}
    </div>
  </body>
</theme-provider>
</html>"#,
        theme = theme,
        html = config.html
    )
}

fn main() {
    #[cfg(target_arch = "wasm32")]
    console_error_panic_hook::set_once();

    let runtime_example = resolve_runtime_example();

    let clear = match runtime_example.theme {
        DemoTheme::Light => Color::srgb(0.953, 0.965, 0.984),
        DemoTheme::Dark => Color::srgb(0.059, 0.078, 0.106),
    };

    App::new()
        .insert_resource(ClearColor(clear))
        .insert_resource(runtime_example.clone())
        .insert_resource(ExtendedUiConfiguration {
            themes_path: "assets/themes".to_string(),
            theme_names: vec!["dark".to_string(), "light".to_string()],
            ..default()
        })
        .add_plugins(
            DefaultPlugins
                .set(WindowPlugin {
                    primary_window: Some(Window {
                        title: format!("{} Example", runtime_example.id),
                        canvas: Some("#bevy".into()),
                        fit_canvas_to_parent: true,
                        prevent_default_event_handling: true,
                        ..default()
                    }),
                    ..default()
                })
                .set(AssetPlugin {
                    meta_check: AssetMetaCheck::Never,
                    ..default()
                }),
        )
        .add_plugins(ExtendedUiPlugin)
        .init_resource::<RuntimeUiActivated>()
        .add_systems(Startup, prepare_runtime_ui)
        .add_systems(Update, activate_runtime_ui)
        .add_systems(Update, update_progress_bar)
        .run();
}

fn prepare_runtime_ui(mut commands: Commands, asset_server: Res<AssetServer>) {
    let handle: Handle<HtmlAsset> = asset_server.load("examples/runtime_template.html");
    commands.insert_resource(RuntimeHtmlHandle(handle));
}

fn activate_runtime_ui(
    mut reg: ResMut<UiRegistry>,
    runtime_html: Option<Res<RuntimeHtmlHandle>>,
    asset_server: Res<AssetServer>,
    config: Res<RuntimeExampleConfig>,
    mut activated: ResMut<RuntimeUiActivated>,
    mut html_assets: ResMut<Assets<HtmlAsset>>,
) {
    if activated.0 {
        return;
    }

    let Some(runtime_html) = runtime_html else {
        return;
    };

    let Some(asset) = html_assets.get_mut(&runtime_html.0) else {
        return;
    };

    let stylesheet: Handle<CssAsset> = asset_server.load("examples/widget_overview.css");
    asset.html = build_runtime_document(&config);
    asset.stylesheets = vec![stylesheet];

    reg.add_and_use(
        format!("runtime_example_{}", config.id),
        HtmlSource::from_handle(runtime_html.0.clone()),
    );
    activated.0 = true;
}

#[html_fn("toggle_button_state")]
fn toggle_button_state(
    In(_event): In<HtmlEvent>,
    mut query: Query<(&mut UIWidgetState, &CssID, &mut UiButton), With<CssID>>,
) {
    for (mut state, id, mut button) in query.iter_mut() {
        if id.0 == "target-button" {
            state.disabled = !state.disabled;
            if state.disabled {
                button.text = "Disabled".to_string();
            } else {
                button.text = "Enabled".to_string();
            }
        }
    }
}

#[html_fn("icon_right")]
fn icon_right(In(target): In<HtmlEvent>, mut query: Query<(Entity, &mut UiButton)>) {
    for (entity, mut button) in query.iter_mut() {
        if entity == target.entity {
            button.icon_place = bevy_extended_ui::styles::IconPlace::Right;
        }
    }
}

#[html_fn("icon_left")]
fn icon_left(In(target): In<HtmlEvent>, mut query: Query<(Entity, &mut UiButton)>) {
    for (entity, mut button) in query.iter_mut() {
        if entity == target.entity {
            button.icon_place = bevy_extended_ui::styles::IconPlace::Left;
        }
    }
}

#[html_fn("show_h1")]
fn show_h1(In(_event): In<HtmlEvent>, mut query: Query<(&mut Visibility, &CssID), With<CssID>>) {
    for (mut visibility, id) in query.iter_mut() {
        if id.0 == "h1" {
            *visibility = if *visibility == Visibility::Visible || *visibility == Visibility::Inherited {
                Visibility::Hidden
            } else {
                Visibility::Visible
            };
        }
    }
}

#[html_fn("show_h2")]
fn show_h2(In(_event): In<HtmlEvent>, mut query: Query<(&mut Visibility, &CssID), With<CssID>>) {
    for (mut visibility, id) in query.iter_mut() {
        if id.0 == "h2" {
            *visibility = if *visibility == Visibility::Visible || *visibility == Visibility::Inherited {
                Visibility::Hidden
            } else {
                Visibility::Visible
            };
        }
    }
}

#[html_fn("on_select_change")]
fn on_select_change(
    In(event): In<HtmlEvent>,
    query: Query<&ChoiceBox>,
    mut text_query: Query<(&CssID, &mut Headline), With<Headline>>,
) {
    let Ok(choice_box) = query.get(event.entity) else {
        return;
    };

    let Some((_text_id, mut headline)) = text_query.iter_mut().find(|(id, _)| id.0 == "sel-text") else {
        return;
    };

    headline.text = format!("Selected: {}", choice_box.value.text);
}

#[html_fn("update_color")]
fn update_color(
    In(event): In<HtmlEvent>,
    picker_q: Query<&ColorPicker>,
    mut headline_q: Query<(&CssID, &mut Headline), With<Headline>>,
) {
    let Ok(picker) = picker_q.get(event.entity) else {
        return;
    };

    let Some((_id, mut headline)) = headline_q.iter_mut().find(|(id, _)| id.0 == "picked-color") else {
        return;
    };

    headline.text = format!("{} | {}", picker.hex(), picker.rgba_string());
}

#[html_fn("on_date_change")]
fn on_date_change(
    In(event): In<HtmlEvent>,
    query: Query<&InputValue>,
    mut text_query: Query<(&CssID, &mut Headline), With<Headline>>,
) {
    let Ok(value) = query.get(event.entity) else {
        return;
    };

    let Some((_id, mut headline)) = text_query.iter_mut().find(|(id, _)| id.0 == "selected-date") else {
        return;
    };

    headline.text = if value.0.is_empty() {
        "Selected: -".to_string()
    } else {
        format!("Selected: {}", value.0)
    };
}

#[html_fn("on_text_change")]
fn on_text_change(
    In(event): In<HtmlEvent>,
    query: Query<&InputValue>,
    mut text_query: Query<(&CssID, &mut Headline), With<Headline>>,
) {
    let Ok(input_value) = query.get(event.entity) else {
        return;
    };

    let Some((_id, mut headline)) = text_query.iter_mut().find(|(id, _)| id.0 == "input-live") else {
        return;
    };

    headline.text = input_value.0.clone();
}

#[html_fn("update_value")]
fn update_value(
    In(event): In<HtmlEvent>,
    query: Query<&Slider>,
    mut text_query: Query<(&CssID, &mut Headline), With<Headline>>,
) {
    let Some((_id, mut headline)) = text_query.iter_mut().find(|(id, _)| id.0 == "slider-value") else {
        return;
    };

    if let Ok(slider) = query.get(event.entity) {
        headline.text = format!("Value: {:.1}", slider.value);
    }
}

#[html_fn("switch_text")]
fn switch_text(
    In(event): In<HtmlEvent>,
    query: Query<&UIWidgetState>,
    mut text_query: Query<(&CssID, &mut Headline), With<Headline>>,
) {
    let Some((_id, mut headline)) = text_query.iter_mut().find(|(id, _)| id.0 == "switch-state") else {
        return;
    };

    if let Ok(state) = query.get(event.entity) {
        headline.text = format!("State: {}", if state.checked { "On" } else { "Off" });
    }
}

pub fn update_progress_bar(
    time: Res<Time>,
    container_q: Query<(&CssID, &UIWidgetState)>,
    mut progress_bar_q: Query<(&CssID, &mut ProgressBar)>,
    mut raw_by_id: Local<HashMap<String, f32>>,
) {
    let mut trigger_hovered = false;
    for (id, state) in &container_q {
        if id.0 == "trigger" {
            trigger_hovered = state.hovered;
            break;
        }
    }

    let dir = if trigger_hovered { 1.0 } else { -1.0 };
    let speed = 12.0;
    let dt = time.delta_secs();

    for (id, mut bar) in &mut progress_bar_q {
        if id.0 != "progress-bar" {
            continue;
        }

        let key = "progress-bar".to_string();
        let raw = raw_by_id.entry(key).or_insert(bar.value);
        *raw = (*raw + dir * speed * dt).clamp(bar.min, bar.max);
        bar.value = if dir > 0.0 { raw.floor() } else { raw.ceil() };
    }
}

#[html_fn("radio_change")]
fn radio_change(
    In(event): In<HtmlChange>,
    set_q: Query<&FieldSelectionSingle>,
    radio_q: Query<&RadioButton>,
    mut text_query: Query<(&CssID, &mut Headline), With<Headline>>,
) {
    let Ok(selection) = set_q.get(event.entity) else {
        return;
    };

    let Some((_id, mut headline)) = text_query.iter_mut().find(|(id, _)| id.0 == "radio-value") else {
        return;
    };

    let Some(selected_entity) = selection.0 else {
        headline.text = "Selected: -".to_string();
        return;
    };

    if let Ok(radio) = radio_q.get(selected_entity) {
        headline.text = format!("Selected: {}", radio.label);
    }
}

#[html_fn("fieldset_change")]
fn fieldset_change(
    In(event): In<HtmlChange>,
    set_q: Query<&FieldSelectionSingle>,
    radio_q: Query<&RadioButton>,
    mut text_query: Query<(&CssID, &mut Headline), With<Headline>>,
) {
    let Ok(selection) = set_q.get(event.entity) else {
        return;
    };

    let Some((_id, mut headline)) = text_query.iter_mut().find(|(id, _)| id.0 == "fieldset-value") else {
        return;
    };

    let Some(selected_entity) = selection.0 else {
        headline.text = "Selection: -".to_string();
        return;
    };

    if let Ok(radio) = radio_q.get(selected_entity) {
        headline.text = format!("Selection: {}", radio.label);
    }
}

#[html_fn("toggle_change")]
fn toggle_change(
    In(event): In<HtmlChange>,
    set_q: Query<&FieldSelectionMulti>,
    toggle_q: Query<&ToggleButton>,
    mut text_query: Query<(&CssID, &mut Headline), With<Headline>>,
) {
    let Ok(selections) = set_q.get(event.entity) else {
        return;
    };

    let Some((_id, mut headline)) = text_query.iter_mut().find(|(id, _)| id.0 == "toggle-state") else {
        return;
    };

    if selections.0.is_empty() {
        headline.text = "Active: -".to_string();
        return;
    }

    let mut labels: Vec<String> = Vec::new();
    for &entity in selections.0.iter() {
        if let Ok(toggle) = toggle_q.get(entity) {
            labels.push(
                toggle
                    .value
                    .as_str()
                    .unwrap_or(toggle.label.as_str())
                    .to_string(),
            );
        }
    }

    if labels.is_empty() {
        headline.text = "Active: -".to_string();
    } else {
        headline.text = format!("Active: {}", labels.join(", "));
    }
}

#[html_fn("on_scroll_change")]
fn on_scroll_change(
    In(event): In<HtmlEvent>,
    scroll_q: Query<&Scrollbar>,
    mut text_query: Query<(&CssID, &mut Headline), With<Headline>>,
) {
    let Ok(scroll) = scroll_q.get(event.entity) else {
        return;
    };

    let Some((_id, mut headline)) = text_query.iter_mut().find(|(id, _)| id.0 == "scroll-value") else {
        return;
    };

    headline.text = format!("Scroll value: {:.1}", scroll.value);
}

#[html_fn("tooltip_button_click")]
fn tooltip_button_click(
    In(_event): In<HtmlEvent>,
    mut text_query: Query<(&CssID, &mut Headline), With<Headline>>,
) {
    let Some((_id, mut headline)) = text_query.iter_mut().find(|(id, _)| id.0 == "tooltip-state") else {
        return;
    };

    headline.text = "Tooltip target clicked".to_string();
}

#[html_fn("login_action")]
fn login_action(
    In(event): In<HtmlSubmit>,
    mut text_query: Query<(&CssID, &mut Headline), With<Headline>>,
) {
    let Some((_id, mut headline)) = text_query.iter_mut().find(|(id, _)| id.0 == "form-result") else {
        return;
    };

    let username = event.data.get("username").cloned().unwrap_or_default();
    let email = event.data.get("email").cloned().unwrap_or_default();

    if username.is_empty() && email.is_empty() {
        headline.text = "Submit received".to_string();
    } else {
        headline.text = format!("Submit: {} ({})", username, email);
    }
}
