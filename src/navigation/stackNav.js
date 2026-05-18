// Module-level ref to the App Stack navigation object.
// Set by MainShell (which is always mounted as the base Stack screen).
// Used by DrawerMenu, which renders outside the Stack and can't use useNavigation().
let _nav = null;
export const setStackNav = nav => { _nav = nav; };
export const getStackNav = () => _nav;
