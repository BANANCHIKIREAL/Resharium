import { readFile } from 'node:fs/promises'

const catalog = JSON.parse(await readFile(new URL('../src/catalog.generated.json', import.meta.url), 'utf8'))
const quote = (value) => value == null ? 'null' : `'${String(value).replaceAll("'", "''")}'`
const values = catalog.map((book, index) => `(${[
  quote(book.id), book.grade, quote(book.subject), quote(book.title), quote(book.author),
  book.year || 'null', quote(book.coverUrl), quote(book.sourceUrl), quote(book.sourceName),
  index < 8 || book.grade === 7 ? 'true' : 'false',
].join(', ')})`).join(',\n')

process.stdout.write(`insert into public.textbooks
  (id, grade, subject, title, author, year, cover_url, source_url, source_name, popular)
values
${values}
on conflict (id) do update set
  grade = excluded.grade,
  subject = excluded.subject,
  title = excluded.title,
  author = excluded.author,
  year = excluded.year,
  cover_url = excluded.cover_url,
  source_url = excluded.source_url,
  source_name = excluded.source_name,
  popular = excluded.popular,
  active = true,
  updated_at = now();\n`)
