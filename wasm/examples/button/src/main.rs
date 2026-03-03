use bevy::prelude::*;
use bevy::ui::InteractionDisabled;

#[cfg(target_arch = "wasm32")]
use web_sys::{window, UrlSearchParams};

#[derive(Resource, Debug, Clone, Copy, PartialEq, Eq)]
struct DemoButtonState {
    disabled: bool,
    icon_side: IconSide,
}

impl Default for DemoButtonState {
    fn default() -> Self {
        Self {
            disabled: false,
            icon_side: IconSide::None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum IconSide {
    None,
    Left,
    Right,
}

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

#[derive(Resource, Debug, Clone, Copy)]
struct DemoPalette {
    canvas_bg: Color,
    panel_bg: Color,
    panel_border: Color,
    button_idle: Color,
    button_hover: Color,
    button_pressed: Color,
    button_disabled: Color,
    button_border_idle: Color,
    button_border_hover: Color,
    button_border_pressed: Color,
    button_border_disabled: Color,
    text_main: Color,
    text_sub: Color,
    icon_fill: Color,
    control_inactive_bg: Color,
    control_inactive_hover_bg: Color,
    control_active_bg: Color,
    control_active_hover_bg: Color,
    control_pressed_bg: Color,
    control_border_inactive: Color,
    control_border_active: Color,
}

impl DemoPalette {
    fn from_theme(theme: DemoTheme) -> Self {
        match theme {
            DemoTheme::Light => Self {
                canvas_bg: Color::srgb(0.93, 0.96, 1.0),
                panel_bg: Color::srgb(1.0, 1.0, 1.0),
                panel_border: Color::srgb(0.12, 0.36, 0.77),
                button_idle: Color::srgb(0.16, 0.39, 0.93),
                button_hover: Color::srgb(0.22, 0.46, 0.99),
                button_pressed: Color::srgb(0.12, 0.31, 0.80),
                button_disabled: Color::srgb(0.65, 0.70, 0.76),
                button_border_idle: Color::srgb(0.10, 0.33, 0.82),
                button_border_hover: Color::srgb(0.16, 0.39, 0.91),
                button_border_pressed: Color::srgb(0.07, 0.27, 0.70),
                button_border_disabled: Color::srgb(0.58, 0.63, 0.70),
                text_main: Color::srgb(0.12, 0.18, 0.28),
                text_sub: Color::srgb(0.34, 0.42, 0.54),
                icon_fill: Color::srgb(0.94, 0.98, 1.0),
                control_inactive_bg: Color::srgb(0.95, 0.97, 1.0),
                control_inactive_hover_bg: Color::srgb(0.90, 0.94, 1.0),
                control_active_bg: Color::srgb(0.24, 0.50, 0.94),
                control_active_hover_bg: Color::srgb(0.18, 0.44, 0.89),
                control_pressed_bg: Color::srgb(0.13, 0.34, 0.73),
                control_border_inactive: Color::srgb(0.60, 0.70, 0.84),
                control_border_active: Color::srgb(0.12, 0.35, 0.82),
            },
            DemoTheme::Dark => Self {
                canvas_bg: Color::srgb(0.04, 0.09, 0.14),
                panel_bg: Color::srgb(0.07, 0.11, 0.17),
                panel_border: Color::srgb(0.22, 0.30, 0.42),
                button_idle: Color::srgb(0.14, 0.32, 0.88),
                button_hover: Color::srgb(0.18, 0.40, 0.97),
                button_pressed: Color::srgb(0.10, 0.25, 0.70),
                button_disabled: Color::srgb(0.28, 0.31, 0.36),
                button_border_idle: Color::srgb(0.37, 0.55, 1.0),
                button_border_hover: Color::srgb(0.59, 0.74, 1.0),
                button_border_pressed: Color::srgb(0.30, 0.45, 0.93),
                button_border_disabled: Color::srgb(0.39, 0.43, 0.48),
                text_main: Color::srgb(0.93, 0.96, 1.0),
                text_sub: Color::srgb(0.66, 0.74, 0.85),
                icon_fill: Color::srgb(0.95, 0.97, 1.0),
                control_inactive_bg: Color::srgb(0.11, 0.16, 0.24),
                control_inactive_hover_bg: Color::srgb(0.16, 0.23, 0.33),
                control_active_bg: Color::srgb(0.14, 0.34, 0.77),
                control_active_hover_bg: Color::srgb(0.20, 0.42, 0.89),
                control_pressed_bg: Color::srgb(0.09, 0.19, 0.45),
                control_border_inactive: Color::srgb(0.23, 0.32, 0.45),
                control_border_active: Color::srgb(0.52, 0.70, 1.0),
            },
        }
    }
}

#[derive(Component)]
struct DemoButton;

#[derive(Component)]
struct DemoStatusLabel;

#[derive(Component)]
struct DemoIconLeft;

#[derive(Component)]
struct DemoIconRight;

#[derive(Component, Clone, Copy, Debug, PartialEq, Eq)]
enum ControlKind {
    Disabled,
    IconLeft,
    IconRight,
}

#[derive(Component)]
struct ControlButton(ControlKind);

#[derive(Component)]
struct ControlLabel(ControlKind);

fn main() {
    #[cfg(target_arch = "wasm32")]
    console_error_panic_hook::set_once();

    let palette = DemoPalette::from_theme(DemoTheme::resolve());

    App::new()
        .insert_resource(ClearColor(palette.canvas_bg))
        .insert_resource(palette)
        .insert_resource(DemoButtonState::default())
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "Button Example".into(),
                canvas: Some("#bevy".into()),
                fit_canvas_to_parent: true,
                prevent_default_event_handling: true,
                ..default()
            }),
            ..default()
        }))
        .add_systems(Startup, setup)
        .add_systems(
            Update,
            (
                control_panel_input,
                apply_button_disable_state,
                sync_button_visuals,
                sync_control_visuals,
                sync_icon_visibility,
            ),
        )
        .run();
}

fn setup(mut commands: Commands, palette: Res<DemoPalette>) {
    commands.spawn(Camera2d);

    commands
        .spawn((
            Node {
                width: Val::Percent(100.0),
                height: Val::Percent(100.0),
                align_items: AlignItems::Center,
                justify_content: JustifyContent::Center,
                padding: UiRect::all(Val::Px(24.0)),
                ..default()
            },
            BackgroundColor(Color::NONE),
        ))
        .with_children(|root| {
            root.spawn((
                Node {
                    width: Val::Px(620.0),
                    max_width: Val::Percent(100.0),
                    flex_direction: FlexDirection::Column,
                    row_gap: Val::Px(18.0),
                    padding: UiRect::all(Val::Px(22.0)),
                    border: UiRect::all(Val::Px(1.0)),
                    border_radius: BorderRadius::all(Val::Px(14.0)),
                    ..default()
                },
                BackgroundColor(palette.panel_bg),
                BorderColor::all(palette.panel_border),
            ))
            .with_children(|panel| {
                panel.spawn((
                    Text::new("Button Widget Demo"),
                    TextFont {
                        font_size: 30.0,
                        ..default()
                    },
                    TextColor(palette.text_main),
                ));

                panel.spawn((
                    Text::new("State: Idle"),
                    TextFont {
                        font_size: 16.0,
                        ..default()
                    },
                    TextColor(palette.text_sub),
                    DemoStatusLabel,
                ));

                panel
                    .spawn((
                        Button,
                        DemoButton,
                        Node {
                            min_width: Val::Px(220.0),
                            height: Val::Px(56.0),
                            padding: UiRect {
                                left: Val::Px(16.0),
                                right: Val::Px(16.0),
                                top: Val::Px(10.0),
                                bottom: Val::Px(10.0),
                            },
                            align_items: AlignItems::Center,
                            justify_content: JustifyContent::Center,
                            column_gap: Val::Px(10.0),
                            border: UiRect::all(Val::Px(1.0)),
                            border_radius: BorderRadius::all(Val::Px(10.0)),
                            ..default()
                        },
                        BackgroundColor(palette.button_idle),
                        BorderColor::all(palette.button_border_idle),
                    ))
                    .with_children(|button| {
                        button.spawn((
                            Node {
                                width: Val::Px(13.0),
                                height: Val::Px(13.0),
                                border_radius: BorderRadius::all(Val::Px(4.0)),
                                display: Display::None,
                                ..default()
                            },
                            BackgroundColor(palette.icon_fill),
                            DemoIconLeft,
                        ));

                        button.spawn((
                            Text::new("Click Me"),
                            TextFont {
                                font_size: 18.0,
                                ..default()
                            },
                            TextColor(Color::WHITE),
                        ));

                        button.spawn((
                            Node {
                                width: Val::Px(13.0),
                                height: Val::Px(13.0),
                                border_radius: BorderRadius::all(Val::Px(4.0)),
                                display: Display::None,
                                ..default()
                            },
                            BackgroundColor(palette.icon_fill),
                            DemoIconRight,
                        ));
                    });

                panel.spawn((
                    Text::new("Controls"),
                    TextFont {
                        font_size: 19.0,
                        ..default()
                    },
                    TextColor(palette.text_main),
                ));

                panel
                    .spawn(Node {
                        width: Val::Percent(100.0),
                        flex_direction: FlexDirection::Column,
                        row_gap: Val::Px(10.0),
                        ..default()
                    })
                    .with_children(|controls| {
                        spawn_control_row(controls, ControlKind::Disabled, "Disabled", &palette);
                        spawn_control_row(controls, ControlKind::IconLeft, "Icon Left", &palette);
                        spawn_control_row(controls, ControlKind::IconRight, "Icon Right", &palette);
                    });
            });
        });
}

fn spawn_control_row(
    parent: &mut ChildSpawnerCommands,
    kind: ControlKind,
    label: &str,
    palette: &DemoPalette,
) {
    parent
        .spawn((
            Button,
            ControlButton(kind),
            Node {
                width: Val::Percent(100.0),
                height: Val::Px(42.0),
                padding: UiRect {
                    left: Val::Px(12.0),
                    right: Val::Px(12.0),
                    top: Val::Px(8.0),
                    bottom: Val::Px(8.0),
                },
                align_items: AlignItems::Center,
                justify_content: JustifyContent::SpaceBetween,
                border: UiRect::all(Val::Px(1.0)),
                border_radius: BorderRadius::all(Val::Px(8.0)),
                ..default()
            },
            BackgroundColor(palette.control_inactive_bg),
            BorderColor::all(palette.control_border_inactive),
        ))
        .with_children(|button| {
            button.spawn((
                Text::new(label.to_string()),
                TextFont {
                    font_size: 15.0,
                    ..default()
                },
                TextColor(palette.text_main),
            ));

            button.spawn((
                Text::new("OFF"),
                TextFont {
                    font_size: 14.0,
                    ..default()
                },
                TextColor(palette.text_sub),
                ControlLabel(kind),
            ));
        });
}

fn control_panel_input(
    mut state: ResMut<DemoButtonState>,
    controls: Query<(&Interaction, &ControlButton), (Changed<Interaction>, With<Button>)>,
) {
    for (interaction, control) in &controls {
        if *interaction != Interaction::Pressed {
            continue;
        }

        match control.0 {
            ControlKind::Disabled => {
                state.disabled = !state.disabled;
            }
            ControlKind::IconLeft => {
                state.icon_side = if state.icon_side == IconSide::Left {
                    IconSide::None
                } else {
                    IconSide::Left
                };
            }
            ControlKind::IconRight => {
                state.icon_side = if state.icon_side == IconSide::Right {
                    IconSide::None
                } else {
                    IconSide::Right
                };
            }
        }
    }
}

fn apply_button_disable_state(
    mut commands: Commands,
    state: Res<DemoButtonState>,
    mut demo_button_q: Query<
        (Entity, &mut Interaction, Option<&InteractionDisabled>),
        With<DemoButton>,
    >,
) {
    if let Ok((button_entity, mut interaction, disabled_marker)) = demo_button_q.single_mut() {
        if state.disabled {
            if disabled_marker.is_none() {
                commands.entity(button_entity).insert(InteractionDisabled);
            }
            *interaction = Interaction::None;
        } else if disabled_marker.is_some() {
            commands.entity(button_entity).remove::<InteractionDisabled>();
        }
    }
}

fn sync_button_visuals(
    state: Res<DemoButtonState>,
    palette: Res<DemoPalette>,
    mut demo_button_q: Query<
        (
            &Interaction,
            &mut BackgroundColor,
            &mut BorderColor,
            Has<InteractionDisabled>,
        ),
        With<DemoButton>,
    >,
    mut status_text_q: Query<&mut Text, With<DemoStatusLabel>>,
) {
    let Ok((interaction, mut background, mut border, is_disabled)) = demo_button_q.single_mut() else {
        return;
    };

    let status = if is_disabled || state.disabled {
        *background = palette.button_disabled.into();
        *border = BorderColor::all(palette.button_border_disabled);
        "Disabled"
    } else {
        match *interaction {
            Interaction::None => {
                *background = palette.button_idle.into();
                *border = BorderColor::all(palette.button_border_idle);
                "Idle"
            }
            Interaction::Hovered => {
                *background = palette.button_hover.into();
                *border = BorderColor::all(palette.button_border_hover);
                "Hovered"
            }
            Interaction::Pressed => {
                *background = palette.button_pressed.into();
                *border = BorderColor::all(palette.button_border_pressed);
                "Pressed"
            }
        }
    };

    for mut text in &mut status_text_q {
        text.0 = format!("State: {status}");
    }
}

fn sync_control_visuals(
    state: Res<DemoButtonState>,
    palette: Res<DemoPalette>,
    mut controls_q: Query<
        (&ControlButton, &Interaction, &mut BackgroundColor, &mut BorderColor),
        With<Button>,
    >,
    mut label_q: Query<(&ControlLabel, &mut TextColor, &mut Text)>,
) {
    for (control, interaction, mut bg, mut border) in &mut controls_q {
        let active = control_active(control.0, &state);

        let base = if active {
            palette.control_active_bg
        } else {
            palette.control_inactive_bg
        };

        let hover = if active {
            palette.control_active_hover_bg
        } else {
            palette.control_inactive_hover_bg
        };

        *bg = match *interaction {
            Interaction::Pressed => palette.control_pressed_bg.into(),
            Interaction::Hovered => hover.into(),
            Interaction::None => base.into(),
        };

        *border = if active {
            BorderColor::all(palette.control_border_active)
        } else {
            BorderColor::all(palette.control_border_inactive)
        };
    }

    for (label, mut text_color, mut text) in &mut label_q {
        let active = control_active(label.0, &state);
        text.0 = if active {
            "ON".to_string()
        } else {
            "OFF".to_string()
        };
        text_color.0 = if active {
            palette.text_main
        } else {
            palette.text_sub
        };
    }
}

fn sync_icon_visibility(
    state: Res<DemoButtonState>,
    mut icon_q: Query<(&mut Node, Option<&DemoIconLeft>, Option<&DemoIconRight>)>,
) {
    for (mut node, is_left, is_right) in &mut icon_q {
        if is_left.is_some() {
            node.display = if state.icon_side == IconSide::Left {
                Display::Flex
            } else {
                Display::None
            };
        } else if is_right.is_some() {
            node.display = if state.icon_side == IconSide::Right {
                Display::Flex
            } else {
                Display::None
            };
        }
    }
}

fn control_active(kind: ControlKind, state: &DemoButtonState) -> bool {
    match kind {
        ControlKind::Disabled => state.disabled,
        ControlKind::IconLeft => state.icon_side == IconSide::Left,
        ControlKind::IconRight => state.icon_side == IconSide::Right,
    }
}
