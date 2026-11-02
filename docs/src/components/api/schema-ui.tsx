'use client';
// The schema UI of the API reference (properties of parameters, request bodies and responses),
// passed to createOpenAPIPage() as `components.SchemaUI`, the way Fumadocs lets a site replace
// parts of the API page. It is fumadocs-openapi 12.5.6's own (packages/shared-api schema
// client, MIT, with the collapsible, select and "copy TypeScript" helpers it uses), with one
// change: a property's copy-link button renders after hydration. That button is invisible until
// the property is hovered or focused and only works with JavaScript, yet in the exported HTML
// it was most of every property (about 880 bytes of classes and icon against the few dozen of the
// property itself), repeated for every property of every operation. The other changes are for
// size too: a property's own elements use short classes (`api-prop`, `api-type`... in
// app/global.css, the same utilities), and the hidden copy of the breadcrumbs, only there to be
// measured, renders after hydration. Everything else, the drill-down into nested schemas, the
// breadcrumbs, the unions, the filter and the links to a property, looks and behaves as
// upstream. Compare with that file when fumadocs-openapi is upgraded.

import { Fragment, createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useTranslations } from '@fuma-translate/react';
import { Check, CheckIcon, ChevronDown, ChevronRightIcon, Copy, FilterIcon, FilterXIcon, LinkIcon } from 'lucide-react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { Collapsible } from '@base-ui/react/collapsible';
import { Menu } from '@base-ui/react/menu';
import { Select } from '@base-ui/react/select';
import { generateSchemaUI, type GenerateSchemaUIOptions, type SchemaData, type SchemaUIGeneratedData } from '@fumadocs/json-schema/react';
import { SchemaUIProvider, useSchemaUI, type SchemaUnion } from '@fumadocs/json-schema/react/client';
import { cn } from '@/lib/cn';
import { useHydrated } from '@/lib/use-hydrated';

export interface SchemaUIProps {
  /** anchor ID of the root schema, links to a property are resolved against it */
  rootId: string;
  name: string;
  required?: boolean;
  as?: 'property' | 'body';
  /** selects the variant of the root schema, like its media type, shown above the breadcrumbs */
  selector?: ReactNode;
  /** actions of the root schema, like copying its type definitions */
  actions?: ReactNode;
  generated: SchemaUIGeneratedData;
}

export interface SchemaUIOptions extends Omit<GenerateSchemaUIOptions, 'translations'> {
  client: Omit<SchemaUIProps, 'generated'>;
}

/** `components.SchemaUI` of the API page: the schema's UI data, then the interactive view. */
export function Schema({ client, ...options }: SchemaUIOptions) {
  const translations = useTranslations().translations;
  const generated = useMemo(
    () => generateSchemaUI({ ...options, translations }),
    // The same inputs upstream memoizes on: the renderers are stable per page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.root, options.readOnly, options.writeOnly, options.showExample, options.renderMarkdown, options.renderCodeblock, translations],
  );
  return <SchemaUI {...client} generated={generated} />;
}

interface TypeContextValue {
  isExpanded?: (name: string, $ref: string) => boolean;
  open: (name: string, $ref: string) => void;
}

const TypeContext = createContext<TypeContextValue | null>(null);

function useTypeContext(): TypeContextValue {
  const ctx = use(TypeContext);
  if (!ctx) throw new Error('Schema UI type used outside its schema');
  return ctx;
}

/** font-mono text-xs text-fd-muted-foreground (app/global.css) */
const typeClassName = 'api-type';
const crumbClassName =
  'truncate rounded-md px-1.5 py-1 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fd-ring data-popup-open:bg-fd-accent';
const chevronClassName = 'size-3.5 shrink-0 text-fd-muted-foreground/60';
/** below the sticky headers of docs layouts */
const scrollMarginClassName = 'scroll-mt-[calc(var(--fd-docs-row-3,0px)+1rem)]';
const tagClassName = 'rounded-md border bg-fd-secondary px-1.5 py-0.5 text-xs text-fd-secondary-foreground';

function SchemaUI({ rootId, name, required = false, as = 'property', selector, actions, generated }: SchemaUIProps) {
  return (
    <SchemaUIProvider id={rootId} name={name} generated={generated}>
      {as === 'body' && generated.refs[generated.$root].type !== 'primitive' ? (
        <SchemaCard id={rootId} selector={selector} actions={actions} />
      ) : (
        <RootProperty
          id={rootId}
          name={name}
          $type={generated.$root}
          required={required}
          actions={
            <>
              {selector}
              {actions}
            </>
          }
        />
      )}
    </SchemaUIProvider>
  );
}

function RootProperty({
  id,
  name,
  $type,
  required,
  actions,
}: {
  id: string;
  name: string;
  $type: string;
  required: boolean;
  actions: ReactNode;
}) {
  const { refs, path, open, back } = useSchemaUI();
  const [collapsed, setCollapsed] = useState(false);
  function isExpanded(name: string, $ref: string) {
    return !collapsed && path[1]?.name === name && path[1].$ref === $ref;
  }
  return (
    <TypeContext
      value={{
        isExpanded,
        open(name, $ref) {
          if (isExpanded(name, $ref)) return setCollapsed(true);
          setCollapsed(false);
          back(0);
          open(name, $ref);
        },
      }}
    >
      <ObjectProperty id={id} name={name} $type={$type} required={required} parentIndex={0} actions={actions}>
        {refs[$type].type !== 'primitive' && (
          <Collapsible.Root open={!collapsed && path.length > 1}>
            <CollapsibleContent className="flow-root overflow-clip">
              <SchemaCard from={1} className="mt-2.5" />
            </CollapsibleContent>
          </Collapsible.Root>
        )}
      </ObjectProperty>
    </TypeContext>
  );
}

function CollapsibleContent({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Collapsible.Panel
      className={cn(
        "overflow-hidden [&[hidden]:not([hidden='until-found'])]:hidden h-(--collapsible-panel-height) transition-[height,opacity] data-starting-style:opacity-0 data-starting-style:h-0 data-ending-style:h-0 data-ending-style:opacity-0",
        className,
      )}
    >
      {children}
    </Collapsible.Panel>
  );
}

const motionClassNames = {
  forward: 'motion-safe:starting:translate-x-6',
  back: 'motion-safe:starting:-translate-x-6',
} as const;

/** the last schema of the path, with the path from `from` as breadcrumbs */
function SchemaCard({
  from = 0,
  id,
  selector,
  actions,
  className,
}: {
  from?: number;
  id?: string;
  selector?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const t = useTranslations({ note: 'schema UI' });
  const { path, open, back } = useSchemaUI();
  const index = path.length - 1;
  const { name, $ref, unions, schema } = path[index];
  const panelKey = `${index}\0${name}\0${$ref}`;
  const [filter, setFilter] = useState({ key: panelKey, value: '' });
  const search = filter.key === panelKey ? filter.value : '';
  const query = search.trim().toLowerCase();
  const [motion, setMotion] = useState<keyof typeof motionClassNames>();
  const headerRef = useRef<HTMLDivElement>(null);
  const filterable = schema.type === 'object' && schema.props.length > 0;
  const described = from > 0 && index === from && $ref === path[0].$ref;
  let content: ReactNode = null;

  function navigate(direction: keyof typeof motionClassNames, update: () => void) {
    flushSync(() => {
      setMotion(direction);
      update();
    });
    headerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (schema.type === 'object') {
    const props: ReactNode[] = [];
    for (const prop of schema.props) {
      if (query && !prop.name.toLowerCase().includes(query)) continue;
      props.push(<ObjectProperty key={prop.name} name={prop.name} $type={prop.$type} required={prop.required} parentIndex={index} />);
    }
    content = props;
    if (props.length === 0 && query)
      content = (
        <div className="not-prose my-3 flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-6 text-center text-fd-muted-foreground">
          <FilterXIcon className="box-content size-4 rounded-lg border bg-fd-secondary p-2" />
          <p>
            {t('No property matching')} <span className="font-medium break-all text-fd-foreground">{`"${search}"`}</span>
          </p>
        </div>
      );
  } else if (schema.type === 'array') {
    content = <ObjectProperty name="[index: integer]" $type={schema.item.$type} parentIndex={index} />;
  }

  return (
    <div
      id={id}
      className={cn('@container overflow-clip rounded-xl border bg-fd-card text-fd-card-foreground', scrollMarginClassName, className)}
    >
      <div ref={headerRef} className={cn('not-prose flex flex-wrap border-b', scrollMarginClassName)}>
        {selector && <div className="flex h-9 basis-full items-center border-b ps-1.5 pe-1 text-[0.8125rem]">{selector}</div>}
        <Breadcrumbs from={from} unions={unions} onBack={(index) => navigate('back', () => back(index))} />
        {(filterable || actions) && (
          <div
            className={cn(
              'flex h-9 items-center gap-1 pe-1',
              filterable && '@max-xl:basis-full @max-xl:border-t @max-xl:ps-1.5',
            )}
          >
            {filterable && (
              <label className="flex h-7 cursor-text items-center gap-1.5 rounded-md border bg-fd-secondary px-2 text-fd-muted-foreground transition-shadow focus-within:ring-1 focus-within:ring-fd-ring @max-xl:flex-1 @xl:w-40">
                <FilterIcon className="size-3.5 shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setFilter({ key: panelKey, value: e.target.value })}
                  aria-label={t('Filter Properties')}
                  placeholder={t('Filter Properties')}
                  className="min-w-0 flex-1 bg-transparent text-[0.8125rem] text-fd-foreground outline-none placeholder:text-fd-muted-foreground"
                />
              </label>
            )}
            {actions}
          </div>
        )}
      </div>
      <TypeContext value={{ open: (name, $ref) => navigate('forward', () => open(name, $ref)) }}>
        <div
          key={panelKey}
          className={cn(
            'px-3',
            motion &&
              'starting:opacity-0 motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]',
            motion && motionClassNames[motion],
          )}
        >
          {!described && <SchemaDescription schema={schema} className="py-2.5" />}
          {content}
        </div>
      </TypeContext>
    </div>
  );
}

/**
 * The path from `from`, the crumbs between the first and last ones collapse into a menu when they don't fit.
 */
function Breadcrumbs({
  from,
  unions,
  onBack,
}: {
  from: number;
  unions: SchemaUnion[];
  onBack: (index: number) => void;
}) {
  const t = useTranslations({ note: 'schema UI' });
  const { path } = useSchemaUI();
  const hydrated = useHydrated();
  const last = path.length - 1;
  const [collapsed, setCollapsed] = useState(0);
  const measure = useCallback((copy: HTMLOListElement | null) => {
    if (!copy) return;
    const element = copy.parentElement!;
    const after = copy.previousElementSibling!;
    const update = () => setCollapsed(countCollapsed(copy, element.clientWidth - after.getBoundingClientRect().width));
    const observer = new ResizeObserver(update);
    update();
    observer.observe(element);
    observer.observe(after);
    return () => observer.disconnect();
  }, []);
  const hidden = Math.min(collapsed, Math.max(0, last - from - 1));
  const crumbs: ReactNode[] = [];
  const menuItems: ReactNode[] = [];
  const copy: ReactNode[] = [];
  let names = '';
  for (let i = from; i <= last; i++) {
    const name = formatName(path[i].name);
    const chevron = i > from && <ChevronRightIcon className={chevronClassName} />;
    names += `${name}\0`;
    copy.push(
      <li key={i} className="flex items-center gap-0.5">
        {chevron}
        <span className={cn('px-1.5 py-1', i === last && 'font-medium')}>{name}</span>
      </li>,
    );
    if (i > from && i <= from + hidden) {
      menuItems.push(
        <Menu.Item
          key={i}
          onClick={() => onBack(i)}
          className="truncate rounded-md px-2 py-1.5 outline-none data-highlighted:bg-fd-accent data-highlighted:text-fd-accent-foreground"
        >
          {name}
        </Menu.Item>,
      );
      continue;
    }
    crumbs.push(
      <li
        key={i}
        className={cn('flex items-center gap-0.5 overflow-hidden', i > from && 'motion-safe:transition-opacity motion-safe:starting:opacity-0')}
      >
        {chevron}
        {i < last ? (
          <button type="button" onClick={() => onBack(i)} className={crumbClassName}>
            {name}
          </button>
        ) : (
          <span aria-current="page" className="truncate px-1.5 py-1 font-medium">
            {name}
          </span>
        )}
      </li>,
    );
  }
  if (menuItems.length > 0)
    crumbs.splice(
      1,
      0,
      <li key="menu" className="flex items-center gap-0.5">
        <ChevronRightIcon className={chevronClassName} />
        <Menu.Root>
          <Menu.Trigger aria-label={t('Show Path', { note: 'aria-label' })} className={crumbClassName}>
            …
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner align="start" sideOffset={4} className="z-50">
              <Menu.Popup className="flex max-h-(--available-height) max-w-72 min-w-40 origin-(--transform-origin) flex-col overflow-y-auto rounded-xl border bg-fd-popover p-1 font-mono text-[0.8125rem] text-fd-popover-foreground shadow-lg outline-none transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
                {menuItems}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </li>,
    );
  return (
    <div className="relative ms-1.5 me-1 flex h-9 min-w-0 flex-1 items-center font-mono text-[0.8125rem]">
      <ol className="grid min-w-0 auto-cols-[minmax(0,max-content)] grid-flow-col items-center">{crumbs}</ol>
      <div className="flex min-w-0 items-center gap-0.5">
        {unions.map((union, depth) => (
          <Fragment key={depth}>
            <ChevronRightIcon className={chevronClassName} />
            <UnionSelect union={union} />
          </Fragment>
        ))}
      </div>
      {/* Invisible, only measured to know how many crumbs fit: nothing to measure on the server. */}
      {hydrated && (
        <ol key={names} ref={measure} aria-hidden className="invisible absolute top-0 flex w-max">
          {copy}
          <li className="flex items-center gap-0.5">
            <ChevronRightIcon className={chevronClassName} />
            <span className="px-1.5 py-1">…</span>
          </li>
        </ol>
      )}
    </div>
  );
}

/** the number of crumbs after the first one to collapse, measured from the hidden copy of all crumbs */
function countCollapsed(copy: HTMLOListElement, available: number): number {
  const widths = Array.from(copy.children, (child) => child.getBoundingClientRect().width);
  const menu = widths.pop() ?? 0;
  let total = 0;
  for (const width of widths) total += width;
  if (total <= available) return 0;
  let count = 0;
  total += menu;
  while (count < widths.length - 2 && total > available) total -= widths[++count];
  return count;
}

/** shorten the names of items and additional properties, like `[index]` */
function formatName(name: string): string {
  const match = /^\[(\w+): \w+]$/.exec(name);
  return match ? `[${match[1]}]` : name;
}

function UnionSelect({ union: { schema, value, select } }: { union: SchemaUnion }) {
  const t = useTranslations({ note: 'schema UI' });
  const items = schema.items.map((item) => ({ label: item.name, value: item.$type }));
  return (
    <Select.Root items={items} value={value} onValueChange={(v) => v && select(v)}>
      <Select.Trigger
        aria-label={t('Schema variant')}
        className={cn(
          'flex items-center w-full rounded-md border p-2 gap-2 text-start text-sm text-fd-secondary-foreground bg-fd-secondary hover:bg-fd-accent focus:outline-none focus:ring focus:ring-fd-ring disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-fd-muted-foreground',
          'h-7 w-auto min-w-0 gap-1 border-0 bg-transparent px-1.5 py-0 text-[0.8125rem] font-medium text-fd-foreground hover:bg-fd-accent focus:ring-0 focus-visible:ring-2 focus-visible:ring-inset data-popup-open:bg-fd-accent',
        )}
      >
        <Select.Value className="truncate" />
        <Select.Icon className="ms-auto text-fd-muted-foreground shrink-0">
          <ChevronDown className="size-3.5" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner align="start" side="bottom" sideOffset={4} className="z-50">
          <Select.Popup className="relative z-50 min-w-[calc(var(--anchor-width)+--spacing(2))] overflow-hidden rounded-lg border bg-fd-popover text-fd-popover-foreground shadow-md">
            <Select.ScrollUpArrow className="inset-x-0 z-10 h-6 from-fd-popover to-transparent top-0 bg-linear-to-b" />
            <Select.List className="p-1">
              {items.map((item) => (
                <Select.Item
                  key={item.value}
                  value={item.value}
                  className={cn(
                    'flex select-none flex-row items-center gap-2 rounded-md py-1.5 px-2 text-sm outline-none data-[highlighted]:bg-fd-accent data-[highlighted]:text-fd-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                    'font-mono text-[0.8125rem]',
                  )}
                >
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator className="ms-auto shrink-0">
                    <Check className="size-3.5 text-fd-primary" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
            <Select.ScrollDownArrow className="inset-x-0 z-10 h-6 from-fd-popover to-transparent bottom-0 bg-linear-to-t" />
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function ObjectProperty({
  id,
  name,
  $type,
  required = false,
  parentIndex,
  actions,
  children,
}: {
  id?: string;
  name: string;
  $type: string;
  required?: boolean;
  parentIndex: number;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const t = useTranslations({ note: 'schema UI' });
  const { refs, path, highlighted, getLink } = useSchemaUI();
  const hydrated = useHydrated();
  const schema = refs[$type];
  const isHighlighted = highlighted === name && parentIndex === path.length - 1;
  const [isChecked, onCopy] = useCopyButton(() => navigator.clipboard.writeText(getLink(parentIndex, name)));
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element || !isHighlighted) return;
      const timer = window.setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      return () => window.clearTimeout(timer);
    },
    [isHighlighted],
  );
  return (
    <div id={id} ref={ref} className="group/property api-prop">
      <div className="not-prose api-prop-head">
        <code className="api-prop-name">
          <span
            className={cn(
              isHighlighted ? 'rounded-sm bg-fd-primary text-fd-primary-foreground' : 'text-fd-primary',
              schema.deprecated && 'line-through opacity-80',
            )}
          >
            {name}
          </span>
          {required ? <span className="text-red-700 dark:text-red-400">*</span> : <span className="text-fd-muted-foreground">?</span>}
        </code>
        {schema.type === 'primitive' ? (
          <span className={typeClassName}>{schema.aliasName}</span>
        ) : (
          <TypeInfo name={name} $ref={$type}>
            {schema.aliasName}
          </TypeInfo>
        )}
        {schema.deprecated && <span className="font-mono text-xs text-yellow-800 dark:text-yellow-400">{t('Deprecated')}</span>}
        {hydrated ? (
          <button
            type="button"
            aria-live="polite"
            onClick={onCopy}
            className={cn(
              buttonVariants({ size: 'icon-xs', variant: 'ghost' }),
              '-my-1 ms-auto text-fd-muted-foreground opacity-0 transition-opacity group-hover/property:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 [&_svg]:size-3.5',
            )}
          >
            {isChecked ? <CheckIcon /> : <LinkIcon />}
            <span className="sr-only">
              {isChecked ? t('Copied Link', { note: 'aria-label' }) : t('Copy Link', { note: 'aria-label' })}
            </span>
          </button>
        ) : (
          // Until the button renders, this keeps the root's actions (media type, TypeScript) at the end.
          actions && <span className="ms-auto" />
        )}
        {actions}
      </div>
      <SchemaDescription schema={schema} className="mt-1" />
      {children}
    </div>
  );
}

function TypeInfo({ name, $ref, children }: { name: string; $ref: string; children: ReactNode }) {
  const { refs } = useSchemaUI();
  const { open, isExpanded } = useTypeContext();
  const schema: SchemaData = refs[$ref];
  if (schema.type === 'primitive' && !schema.description && !schema.infoTags?.length)
    return <span className={typeClassName}>{children}</span>;
  if (schema.type === 'and' || schema.type === 'or')
    return (
      <span className={cn(typeClassName, 'flex flex-wrap items-center gap-1.5')}>
        {schema.items.map((item, i) => (
          <Fragment key={item.$type}>
            {i > 0 && (schema.type === 'and' ? '&' : '|')}
            <TypeInfo name={name} $ref={item.$type}>
              {item.name}
            </TypeInfo>
          </Fragment>
        ))}
      </span>
    );
  if (schema.type === 'array')
    return (
      <span className={cn(typeClassName, 'flex flex-wrap items-center')}>
        array&lt;
        <TypeInfo name={`${name}[]`} $ref={schema.item.$type}>
          {refs[schema.item.$type].aliasName}
        </TypeInfo>
        &gt;
      </span>
    );
  return (
    <button
      type="button"
      aria-expanded={isExpanded?.(name, $ref)}
      onClick={() => open(name, $ref)}
      className={cn(
        typeClassName,
        'text-start underline decoration-dotted underline-offset-4 transition-colors hover:text-fd-accent-foreground aria-expanded:text-fd-accent-foreground aria-expanded:decoration-solid',
      )}
    >
      {children}
    </button>
  );
}

function SchemaDescription({ schema: { description, infoTags = [] }, className }: { schema: SchemaData; className?: string }) {
  if (!description && infoTags.length === 0) return null;
  return (
    <div className={cn('api-desc', className)}>
      {description && <div className="prose-no-margin">{description}</div>}
      {infoTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {infoTags.map((tag, i) => {
            if ('node' in tag) return <Fragment key={i}>{tag.node}</Fragment>;
            if ('open' in tag) return <OpenTag key={i} label={tag.label} value={tag.value} open={tag.open} />;
            if ('list' in tag)
              return (
                <div key={i} className="not-prose flex w-full flex-wrap items-center gap-1.5 text-xs">
                  {tag.label}
                  {tag.list.map((item, j) => (
                    <code key={j} className={tagClassName}>
                      {item}
                    </code>
                  ))}
                </div>
              );
            if (tag.block)
              return (
                <div key={i} className="not-prose flex w-full flex-col gap-1.5 text-xs">
                  {tag.label}
                  {tag.value}
                </div>
              );
            return (
              <div key={i} className={cn(tagClassName, 'inline-flex max-w-full items-baseline gap-1.5')}>
                <span className="not-prose shrink-0 text-fd-muted-foreground">{tag.label}</span>
                {tag.prose ? (
                  <div className="prose-xs prose-no-margin min-w-0 flex-1">{tag.value}</div>
                ) : (
                  <code className="not-prose min-w-0 wrap-break-word">{tag.value}</code>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** a tag opening a schema, like the type of a property */
function OpenTag({ label, value, open: { name, $ref } }: { label: ReactNode; value?: ReactNode; open: { name: string; $ref: string } }) {
  const { open, isExpanded } = useTypeContext();
  return (
    <button
      type="button"
      aria-expanded={isExpanded?.(name, $ref)}
      onClick={() => open(name, $ref)}
      className={cn(
        tagClassName,
        'group/open inline-flex max-w-full items-center gap-1.5 text-start transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring aria-expanded:bg-fd-accent',
      )}
    >
      <span className="not-prose shrink-0 text-fd-muted-foreground">{label}</span>
      {value && <code className="not-prose min-w-0 truncate">{value}</code>}
      <ChevronRightIcon className="size-3 shrink-0 text-fd-muted-foreground transition-transform duration-200 group-hover/open:translate-x-0.5 motion-reduce:transition-none" />
    </button>
  );
}

/** copies the TypeScript definitions of a schema, generated on click (upstream's, for the responses) */
export function CopyTypeScript({ name, generate }: { name: string; generate: () => string | undefined | Promise<string | undefined> }) {
  const t = useTranslations({ note: 'TypeScript definitions' });
  const [isChecked, onCopy] = useCopyButton(() => {
    const code = generate();
    if (typeof code === 'string') return navigator.clipboard.writeText(code);
    return Promise.resolve(code).then((code) => {
      if (code) return navigator.clipboard.writeText(code);
    });
  });
  return (
    <button
      type="button"
      title={t('Use the {name} type in TypeScript.', { variables: { name } })}
      onClick={onCopy}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'sm' }),
        '-my-1 shrink-0 gap-1.5 text-fd-muted-foreground [&_svg]:size-3.5',
      )}
    >
      {isChecked ? <Check /> : <Copy />}
      TypeScript
    </button>
  );
}
