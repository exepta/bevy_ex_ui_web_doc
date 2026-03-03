import Button from './Button'
import Checkbox from './Checkbox'
import ChoiceBox from './ChoiceBox'
import ColorPicker from './ColorPicker'
import DatePicker from './DatePicker'
import Divider from './Divider'
import Fieldset from './Fieldset'
import Headline from './Headline'
import Image from './Image'
import InputField from './InputField'
import Paragraph from './Paragraph'
import ProgressBar from './ProgressBar'
import RadioButton from './RadioButton'
import Scrollbar from './Scrollbar'
import Slider from './Slider'
import SwitchButton from './SwitchButton'
import ToggleButton from './ToggleButton'
import Tooltip from './Tooltip'

export const widgetComponents = {
  Button,
  Checkbox,
  ChoiceBox,
  ColorPicker,
  DatePicker,
  Divider,
  Fieldset,
  Headline,
  Image,
  InputField,
  Paragraph,
  ProgressBar,
  RadioButton,
  Scrollbar,
  Slider,
  SwitchButton,
  ToggleButton,
  Tooltip,
} as const

export type WidgetName = keyof typeof widgetComponents
export const widgetNames = Object.keys(widgetComponents) as WidgetName[]
