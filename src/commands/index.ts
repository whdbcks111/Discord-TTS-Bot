import { joinCommand } from "./join";
import { leaveCommand } from "./leave";
import { setGenderCommand, setLanguageCommand, setPitchCommand, setSpeedCommand } from "./settings";

const availableCommands = [ joinCommand, leaveCommand, setGenderCommand, setLanguageCommand, setPitchCommand, setSpeedCommand ]

export default availableCommands;