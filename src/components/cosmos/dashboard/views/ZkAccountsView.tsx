/* ZkAccountsView: the private accounts on a view of their own (product owner, 2026-10-27: private
   payments and private accounts are separate views). Customers' Stellar wallets registered on Cosmos
   Pay's confidential token: their figures, then their table (ZkAccountPanel), which adds, opens and
   removes them. A row's count of payments received opens Private payments filtered to the account.
   Testnet (the sandbox) only for now. */
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n/index";
import { zkPayments as zkApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { goFiltered } from "@/components/cosmos/dashboard/hooks";
import { parseZkConfig } from "@/lib/zk/checkout-api";
import { ZkAccountPanel, useCustomerAccounts } from "@/components/cosmos/dashboard/components/ZkAccountPanel";

export function ZkAccountsView({ canAdd = false, canRemove = false, orgId, env = "dev", onGo }) {
  const t = useT();
  const z = t.zk;
  const [config, setConfig] = useState(undefined);
  // The private payments, to count what each account received; null while they load.
  const [payments, setPayments] = useState(null);
  const { customers, accounts, error, reload } = useCustomerAccounts(env);

  // An answer for an organization or environment the view has since left is dropped.
  useEffect(() => {
    if (!orgId) return;
    let current = true;
    setConfig(undefined);
    setPayments(null);
    zkApi.config(orgId, env).then((c) => { if (current) setConfig(c && c.enabled ? c : null); }).catch(() => { if (current) setConfig(null); });
    zkApi.list(orgId, env, { take: 100 })
      .then((res) => { if (current) setPayments(Array.isArray(res?.data) ? res.data : []); })
      .catch(() => { if (current) setPayments([]); });
    return () => { current = false; };
  }, [orgId, env]);
  const zkConfig = useMemo(() => (config ? parseZkConfig(config) : null), [config]);
  const showPaymentsTo = (address) => goFiltered(onGo, "zkPayments", { q: address });

  return (
    <>
      <ViewHead title={z.account.title} />
      {config === null && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.link}<span>{z.unavailable}</span></div>}
      {config === undefined && <div className="panel"><TableSkeleton label={t.dash.cosmos.loading} cols={7} /></div>}
      {zkConfig && (
        <ZkAccountPanel
          key={`${orgId}:${env}`} config={zkConfig} orgId={orgId} env={env}
          accounts={accounts} loadError={error} customers={customers}
          canAdd={canAdd} canRemove={canRemove} onChanged={reload}
          payments={payments} onShowPayments={showPaymentsTo}
        />
      )}
    </>
  );
}
