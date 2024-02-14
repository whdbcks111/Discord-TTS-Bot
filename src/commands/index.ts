import { joinCommand } from "./join";
import { leaveCommand } from "./leave";
import { togglePrivateChannelCommand, setGenderCommand, setLanguageCommand, setPitchCommand, setSpeedCommand, seePrivateChannelsCommand } from "./settings";

const availableCommands = [ joinCommand, leaveCommand, setGenderCommand, setLanguageCommand, setPitchCommand, setSpeedCommand, togglePrivateChannelCommand, seePrivateChannelsCommand ]

export default availableCommands;