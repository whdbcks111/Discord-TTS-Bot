import { joinCommand } from "./join";
import { leaveCommand } from "./leave";
import { togglePrivateChannelCommand, setGenderCommand, setLanguageCommand, setPitchCommand, setSpeedCommand, seePrivateChannelsCommand } from "./settings";
import { stopCommand } from "./stop";

const availableCommands = [ 
    joinCommand, 
    leaveCommand, 
    setGenderCommand, 
    setLanguageCommand, 
    setPitchCommand, 
    setSpeedCommand, 
    togglePrivateChannelCommand, 
    seePrivateChannelsCommand,
    stopCommand
];

export default availableCommands;