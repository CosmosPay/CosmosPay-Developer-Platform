import { HOME, startLogout } from "@/components/cosmos/shared";
import { DI } from "../icons";

/* Shared account-menu options (used by both the sidebar and the topbar menus). */
export function AccountMenuItems({ pm, onAccount, onBilling }) {
  return (
    <>
      <button className="prof-opt" onClick={onAccount}>{DI.user} {pm.account}</button>
      <button className="prof-opt" onClick={onBilling}>{DI.payments} {pm.billing}</button>
      <a className="prof-opt" href="/docs">{DI.docs} {pm.docs}</a>
      <a className="prof-opt" href={HOME}>{DI.org} {pm.backToSite}</a>
      <button className="prof-opt danger" onClick={() => startLogout()}>{DI.logout} {pm.logout}</button>
    </>
  );
}
