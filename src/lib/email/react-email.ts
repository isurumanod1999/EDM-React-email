/**
 * React Email components and `render`.
 *
 * These come from `@react-email/components` rather than the `react-email`
 * package: `react-email` is the CLI/preview-server distribution and drags in
 * Node-only dependencies (esbuild, chokidar, socket.io). Bundling it into a
 * client component makes every export resolve to `undefined` at render time.
 *
 * @see https://react.email/docs/components/button
 */
export {
  Body,
  Button,
  CodeBlock,
  CodeInline,
  Column,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Markdown,
  Preview,
  Row,
  Section,
  Text,
  dracula,
  oneDark,
  oneLight,
  nightOwl,
  render,
  xonokai,
} from '@react-email/components';
