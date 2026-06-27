import { useRef, useState } from "react";
import { Avatar, showToast, startLogout } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { DI } from "@/components/cosmos/dashboard/icons";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";

/* Read an image file and center-crop + downscale it to a small square data URL, so the
   avatar stays tiny (a few KB) and consistent regardless of the source dimensions. */
const MAX_FILE = 8 * 1024 * 1024; // reject obviously huge originals before decoding
function fileToAvatar(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return reject(new Error("type"));
    if (file.size > MAX_FILE) return reject(new Error("size"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const out = 256;
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("ctx"));
      ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load")); };
    img.src = url;
  });
}

/* Editable profile card — display name, bio and avatar. Email + role stay read-only
   (they come from the real OAuth/SSO session). */
function ProfileCard({ user, onSaveProfile }) {
  const t = useT();
  const ac = t.dash.account;
  const pf = ac.profile;
  const u = user || {};
  const fileRef = useRef(null);

  const initialName = u.displayName || u.name || "";
  const initialBio = u.bio || "";
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  // photo: the data URL / URL currently shown in the editor; null = no photo.
  const [photo, setPhoto] = useState(u.image || null);
  const [photoDirty, setPhotoDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const editUser = { ...u, name, image: photo };
  const dirty = name.trim() !== initialName.trim() || bio.trim() !== initialBio.trim() || photoDirty;

  const sync = () => {
    setName(initialName); setBio(initialBio);
    setPhoto(u.image || null); setPhotoDirty(false);
  };
  const reset = () => { sync(); setEditing(false); };
  const startEdit = () => { sync(); setEditing(true); };
  const pickFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    fileToAvatar(file)
      .then((dataUrl) => { setPhoto(dataUrl); setPhotoDirty(true); })
      .catch((err) => showToast(err.message === "size" ? pf.photoTooLarge : pf.photoInvalid, "error"));
  };
  const removePhoto = () => { setPhoto(null); setPhotoDirty(true); };
  const save = () => {
    if (!onSaveProfile || saving) return;
    const patch = { displayName: name.trim(), bio: bio.trim() };
    if (photoDirty) patch.avatarUrl = photo || "";
    setSaving(true);
    Promise.resolve(onSaveProfile(patch))
      .then(() => { setPhotoDirty(false); setEditing(false); showToast(pf.saved); })
      .catch(() => showToast(pf.saveError, "error"))
      .finally(() => setSaving(false));
  };

  return (
    <div className="panel set-panel">
      <div className="panel-head">
        <h3>{pf.title}</h3>
        {!editing && onSaveProfile && <button className="link-btn" onClick={startEdit}>{pf.edit}</button>}
      </div>
      <div className="set-body">
        {editing ? (
          <>
            <div className="acct-avatar-edit">
              <Avatar user={editUser} size={72} />
              <div className="acct-av-actions">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickFile} />
                <div className="acct-av-row">
                  <button className="btn btn-soft btn-sm" onClick={() => fileRef.current && fileRef.current.click()}>{photo ? pf.changePhoto : pf.uploadPhoto}</button>
                  {photo && <button className="btn btn-soft btn-sm danger-soft" onClick={removePhoto}>{pf.removePhoto}</button>}
                </div>
                <span className="acct-av-hint">{pf.photoHint}</span>
              </div>
            </div>
            <div className="fld">
              <label className="field-l">{pf.displayName}</label>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={pf.displayNamePlaceholder} maxLength={120} />
            </div>
            <div className="fld">
              <label className="field-l">{pf.bio} <span className="field-hint">{t.dash.common.optional}</span></label>
              <textarea className="field acct-bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder={pf.bioPlaceholder} maxLength={400} rows={3} />
            </div>
            <div className="set-row"><div className="set-l">{pf.email}</div><div className="set-v">{u.email || "—"}</div></div>
            <div className="set-row"><div className="set-l">{pf.role}</div><div className="set-v"><span className="kg pub">{t.dash.roleNames[u.role] || u.role || "—"}</span></div></div>
            <div className="set-note">{pf.editNote}</div>
            <div className="modal-actions" style={{ marginTop: 14 }}>
              <button className="btn btn-violet" disabled={!dirty || saving} onClick={save}>{saving ? pf.saving : pf.save}</button>
              <button className="btn btn-soft" disabled={saving} onClick={reset}>{t.dash.common.cancel}</button>
            </div>
          </>
        ) : (
          <>
            <div className="acct-id"><Avatar user={u} size={56} /><div className="acct-id-meta"><b>{u.name || "—"}</b><span>{u.email || "—"}</span></div></div>
            {u.bio && <div className="set-row"><div className="set-l">{pf.bio}</div><div className="set-v">{u.bio}</div></div>}
            <div className="set-row"><div className="set-l">{pf.name}</div><div className="set-v">{u.name || "—"}</div></div>
            <div className="set-row"><div className="set-l">{pf.email}</div><div className="set-v">{u.email || "—"}</div></div>
            <div className="set-row"><div className="set-l">{pf.role}</div><div className="set-v"><span className="kg pub">{t.dash.roleNames[u.role] || u.role || "—"}</span></div></div>
            <div className="set-note">{pf.note}</div>
          </>
        )}
      </div>
    </div>
  );
}

/* Personal account — the signed-in user's own profile, appearance & session.
   Kept separate from the organization settings. Profile name/photo/bio are editable;
   email + role come from the real OAuth/SSO session. */
export function AccountView({ user, theme, setTheme, planId, limits, orgCount, onChangePlan, onSaveProfile, plansEnabled = true }) {
  const t = useT();
  const ac = t.dash.account;
  const ap = t.dash.settings.appearance;
  const sp = t.dash.settings.plan;
  const fmtLimit = (n) => (n == null ? "∞" : n);
  return (
    <>
      <ViewHead title={ac.title} sub={ac.sub} />
      <div className="set-grid">
        <ProfileCard user={user} onSaveProfile={onSaveProfile} />
        {plansEnabled && <div className="panel set-panel"><div className="panel-head"><h3>{sp.title}</h3>{onChangePlan && <button className="link-btn" onClick={onChangePlan}>{sp.change}</button>}</div><div className="set-body">
          <div className="set-row"><div className="set-l">{sp.current}</div><div className="set-v"><span className="kg pub">{t.dash.planNames[planId] || planId}</span></div></div>
          <div className="set-row"><div className="set-l">{sp.orgs}</div><div className="set-v">{orgCount} / {fmtLimit(limits.maxOrgs)}</div></div>
          <div className="set-note">{sp.perOrgNote}</div>
        </div></div>}
        <div className="panel set-panel"><div className="panel-head"><h3>{ap.title}</h3></div><div className="set-body">
          <div className="set-row"><div className="set-l">{ap.theme}</div><div className="seg2"><button className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")}>{ap.light}</button><button className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")}>{ap.dark}</button></div></div>
        </div></div>
        <div className="panel set-panel"><div className="panel-head"><h3>{ac.session.title}</h3></div><div className="set-body">
          <div className="set-note">{ac.session.desc}</div>
          <button className="btn btn-soft danger-soft" style={{ marginTop: 8 }} onClick={() => startLogout()}>{DI.logout} {ac.session.signOut}</button>
        </div></div>
      </div>
    </>
  );
}
