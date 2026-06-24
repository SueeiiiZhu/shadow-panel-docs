<template>
  <div class="prose-doc"><slot /></div>
</template>

<style>
.prose-doc {
  color: color-mix(in srgb, var(--foreground) 90%, transparent);
  font-size: 0.975rem;
  line-height: 1.75;
}
.prose-doc h2 {
  margin-top: 2.75rem;
  margin-bottom: 1rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--foreground);
  scroll-margin-top: 5rem;
}
.prose-doc h2::before {
  content: '';
  display: inline-block;
  width: 0.3rem;
  height: 1.15rem;
  margin-right: 0.6rem;
  vertical-align: -0.12rem;
  border-radius: 9999px;
  background: var(--primary);
}
.prose-doc h3 {
  margin-top: 2rem;
  margin-bottom: 0.6rem;
  font-size: 1.15rem;
  font-weight: 650;
  color: var(--foreground);
  scroll-margin-top: 5rem;
}
.prose-doc p {
  margin: 0.9rem 0;
}
.prose-doc a {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
}
.prose-doc ul,
.prose-doc ol {
  margin: 0.9rem 0;
  padding-left: 1.4rem;
}
.prose-doc ul {
  list-style: none;
}
.prose-doc ul > li {
  position: relative;
}
.prose-doc ul > li::before {
  content: '';
  position: absolute;
  left: -1rem;
  top: 0.72em;
  width: 0.36rem;
  height: 0.36rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--primary) 70%, transparent);
}
.prose-doc ol {
  list-style: decimal;
}
.prose-doc li {
  margin: 0.4rem 0;
}
.prose-doc li::marker {
  color: var(--muted-foreground);
}
.prose-doc strong {
  color: var(--foreground);
  font-weight: 650;
}
.prose-doc code:not(pre code) {
  font-family: var(--font-mono);
  font-size: 0.83em;
  padding: 0.15em 0.4em;
  border-radius: 0.375rem;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: color-mix(in srgb, var(--primary) 90%, var(--foreground));
  white-space: nowrap;
}
.prose-doc table {
  width: 100%;
  margin: 1.25rem 0;
  border-collapse: collapse;
  font-size: 0.9rem;
  overflow: hidden;
  border-radius: 0.6rem;
  border: 1px solid var(--border);
}
.prose-doc thead {
  background: color-mix(in srgb, var(--muted) 60%, transparent);
}
.prose-doc th {
  text-align: left;
  font-weight: 650;
  padding: 0.6rem 0.85rem;
  color: var(--foreground);
}
.prose-doc td {
  padding: 0.6rem 0.85rem;
  border-top: 1px solid var(--border);
  vertical-align: top;
}
.prose-doc tbody tr:hover {
  background: color-mix(in srgb, var(--muted) 40%, transparent);
}
.prose-doc hr {
  margin: 2.5rem 0;
  border: none;
  border-top: 1px solid var(--border);
}
.prose-doc blockquote {
  margin: 1.2rem 0;
  padding: 0.2rem 0 0.2rem 1rem;
  border-left: 3px solid var(--primary);
  color: var(--muted-foreground);
}
</style>
