'use client';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { staticClient } from 'fumadocs-core/search/client/orama-static';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { create } from 'zbsearch';

/**
 * The client-side search database, built to match the index the server exports.
 *
 * fumadocs 16.15 swapped the static search engine from Orama to ZBSearch (its rename):
 * `oramaStaticClient` / `initOrama` are now deprecated aliases of `staticClient` / `initDB`,
 * and the instance has to come from `zbsearch`'s `create` — an Orama one fails to compile,
 * which is what broke the docs build on the 16.11 → 16.15 bump. Only the module PATH keeps
 * the old `orama-static` name upstream.
 *
 * The language is the reason this function exists at all: fumadocs' default DB is created
 * without one, while `createFromSource(source, { language: 'english' })` in
 * `app/api/search/route.ts` builds the exported index WITH it. Both sides have to tokenize
 * and stem the same way or the query never matches what was indexed, so the two values move
 * together.
 */
function initDB() {
  return create({
    schema: { _: 'string' },
    // https://docs.orama.com/docs/orama-js/supported-languages
    language: 'english',
  });
}

export default function DefaultSearchDialog(props: SharedProps) {
  // The docs are URL-localized, so the static index is per-locale. Filter by the active UI
  // locale so results link to the right localized pages. The index lives under the /docs
  // basePath, which fumadocs' client fetch does NOT prefix automatically.
  const { locale } = useI18n();
  const { search, setSearch, query } = useDocsSearch({
    client: staticClient({
      initDB,
      from: '/docs/api/search',
    }),
    locale,
  });

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />
      </SearchDialogContent>
    </SearchDialog>
  );
}
