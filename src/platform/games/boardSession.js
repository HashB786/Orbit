// A smart-board game is started from Host setup and survives a refresh via sessionStorage.
const KEY = 'orbit.board';

export const saveBoardSession = (session) => sessionStorage.setItem(KEY, JSON.stringify(session));

export const loadBoardSession = () => {
    try {
        return JSON.parse(sessionStorage.getItem(KEY) || 'null');
    } catch {
        return null;
    }
};
