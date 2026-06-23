export function ViewHead({ title, sub, children }) {
  return (<div className="view-head"><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div><div className="vh-actions">{children}</div></div>);
}
