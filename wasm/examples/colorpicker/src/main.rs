use bevy::asset::AssetMetaCheck;
use bevy::prelude::*;
use bevy_extended_ui::html::{HtmlChange, HtmlEvent, HtmlSource, HtmlSubmit};
use bevy_extended_ui::io::HtmlAsset;
use bevy_extended_ui::registry::UiRegistry;
use bevy_extended_ui::styles::CssID;
use bevy_extended_ui::widgets::{
    Button as UiButton, ChoiceBox, ColorPicker, FieldSelectionMulti, FieldSelectionSingle,
    Headline, InputValue, ProgressBar, RadioButton, Scrollbar, Slider, ToggleButton,
    UIWidgetState,
};
use bevy_extended_ui::ExtendedUiPlugin;
use bevy_extended_ui_macros::html_fn;
use std::collections::HashMap;

#[cfg(target_arch = "wasm32")]
use web_sys::{window, UrlSearchParams};

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

fn current_example_slug() -> String {
    env!("CARGO_PKG_NAME")
        .trim_end_matches("_example")
        .to_string()
}

fn main() {
    #[cfg(target_arch = "wasm32")]
    console_error_panic_hook::set_once();

    let clear = match DemoTheme::resolve() {
        DemoTheme::Light => Color::srgb(0.93, 0.96, 1.0),
        DemoTheme::Dark => Color::srgb(0.04, 0.09, 0.14),
    };

    App::new()
        .insert_resource(ClearColor(clear))
        .add_plugins(
            DefaultPlugins
                .set(WindowPlugin {
                    primary_window: Some(Window {
                        title: format!("{} Example", current_example_slug()),
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
        .add_systems(Startup, load_ui)
        .add_systems(Update, update_progress_bar)
        .run();
}

fn load_ui(mut reg: ResMut<UiRegistry>, asset_server: Res<AssetServer>) {
    let slug = current_example_slug();
    let path = format!("examples/{slug}.html");
    let handle: Handle<HtmlAsset> = asset_server.load(path);
    reg.add_and_use(format!("{slug}_ui"), HtmlSource::from_handle(handle));
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

    let mut labels = Vec::new();
    for &entity in selections.0.iter() {
        if let Ok(toggle) = toggle_q.get(entity) {
            labels.push(toggle.value.clone());
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
