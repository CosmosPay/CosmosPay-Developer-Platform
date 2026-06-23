/* Optional convenience barrel for the dashboard feature. The shell (Dashboard.jsx)
   imports from the focused modules directly; new code can pull from here. */
export { DI, IcLock } from "./icons";
export * from "./views/index";
export * from "./modals/index";
export { OrgSwitcher } from "./widgets/OrgSwitcher";
export { EnvSwitcher } from "./widgets/EnvSwitcher";
export { ProfileMenu } from "./widgets/ProfileMenu";
export { TopbarProfile } from "./widgets/TopbarProfile";
export { NotificationsMenu } from "./widgets/NotificationsMenu";
export { AccountMenuItems } from "./widgets/AccountMenuItems";
export { deviceLabel, notifIp, humanizeLocal } from "./helpers";
