// ==========================================
// ★ 変更厳禁 ★ EPUB生成用 固定テンプレート群
// 
// このファイルはEPUBファイル（実体はZIP）の内部に生成される
// 各種XMLやCSSの雛形（テンプレート）をまとめたものです。
// ==========================================

const EPUB_TEMPLATES = Object.freeze({

    // ---------------------------------------------------------
    // 1. マイムタイプ
    // 出力先: mimetype (拡張子なし)
    // 役割: このZIPファイルがEPUB形式であることをリーダーに伝える宣言です。
    // ---------------------------------------------------------
    mimetype: 'application/epub+zip',
    

    // ---------------------------------------------------------
    // 2. コンテナ設定 (container.xml)
    // 出力先: META-INF/container.xml
    // 役割: EPUBの心臓部であるOPFファイル（standard.opf）がどこにあるかを示します。
    // ---------------------------------------------------------
    container: `<?xml version="1.0" encoding="UTF-8"?>
<container
 version="1.0"
 xmlns="urn:oasis:names:tc:opendocument:xmlns:container"
>
<rootfiles>
<rootfile
 full-path="item/standard.opf"
 media-type="application/oebps-package+xml"
/>
</rootfiles>
</container>`,


    // ---------------------------------------------------------
    // 3. スタイルシート (CSS)
    // 出力先: item/style/fixed-layout-jp.css
    // 役割: 画像を画面いっぱいに表示し、余白をなくすための固定レイアウト用CSSです。
    // ---------------------------------------------------------
    css: `@charset "UTF-8";

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  font-size: 0;
}
div.main {
  width: 100%;
  height: 100%;
}
svg {
  margin: 0;
  padding: 0;
}`,


    // ---------------------------------------------------------
    // 4. 各ページのHTML (XHTML)
    // 出力先: item/xhtml/p-cover.xhtml および p-001.xhtml など (ページ数分生成)
    // 役割: 画像を1枚ずつ表示するための枠組みとなるHTMLページです。
    // ---------------------------------------------------------
    getXhtml: (w, h, title, escapedHref) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html
 xmlns="http://www.w3.org/1999/xhtml"
 xmlns:epub="http://www.idpf.org/2007/ops"
 xml:lang="ja"
>
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<link rel="stylesheet" type="text/css" href="../style/fixed-layout-jp.css"/>
<meta name="viewport" content="width=${w}, height=${h}"/>
</head>
<body>
<div class="main">

<svg xmlns="http://www.w3.org/2000/svg" version="1.1"
 xmlns:xlink="http://www.w3.org/1999/xlink"
 width="100%" height="100%" viewBox="0 0 ${w} ${h}">
<image width="${w}" height="${h}" xlink:href="../image/${escapedHref}"/>
</svg>

</div>
</body>
</html>`,


    // ---------------------------------------------------------
    // 5. ナビゲーション文書 (EPUB3用 目次)
    // 出力先: item/navigation-documents.xhtml
    // 役割: 最新のEPUB3対応リーダーで読み込まれる、目次（TOC）の実体です。
    // ---------------------------------------------------------
    getNav: (title, navList) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html
 xmlns="http://www.w3.org/1999/xhtml"
 xmlns:epub="http://www.idpf.org/2007/ops"
 xml:lang="ja"
>
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
</head>
<body>
<nav epub:type="toc" id="toc">
<h1>${title}</h1>
<ol>
${navList}</ol>
</nav>
</body>
</html>`,


    // ---------------------------------------------------------
    // 6. NCX文書 (EPUB2互換用 目次)
    // 出力先: item/toc.ncx
    // 役割: 古いリーダーやKindle端末向けの後方互換用目次データです。
    // ---------------------------------------------------------
    getNcx: (title, bookId, navPoints) => `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head>
<meta name="dtb:uid" content="${bookId}"/>
<meta name="dtb:depth" content="0"/>
<meta name="dtb:totalPageCount" content="0"/>
<meta name="dtb:maxPageNumber" content="0"/>
</head>
<docTitle>
<text>${title}</text>
</docTitle>
<navMap>
${navPoints}</navMap>
</ncx>`,


    // ---------------------------------------------------------
    // 7. パッケージ文書 (OPF)
    // 出力先: item/standard.opf
    // 役割: 作品名や著者などのメタデータ、内包する全ファイルのリスト(manifest)、
    //       そしてページの表示順(spine)を定義する、EPUBの最も重要なファイルです。
    // ---------------------------------------------------------
    getOpf: (p) => `<?xml version="1.0" encoding="UTF-8"?>
<package
 xmlns="http://www.idpf.org/2007/opf"
 version="3.0"
 xml:lang="ja"
 unique-identifier="unique-id"
 prefix="rendition: http://www.idpf.org/vocab/rendition/#
         ebpaj: http://www.ebpaj.jp/"
>
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms">

<!-- 作品名 -->
<dc:title id="title">${p.title}</dc:title>
<meta refines="#title" property="file-as">${p.titleRuby}</meta>

<!-- 著者名 -->
<dc:creator id="author">${p.author}</dc:creator>
<meta refines="#author" property="role" scheme="marc:relators">aut</meta>
<meta refines="#author" property="file-as">${p.authorRuby}</meta>

<!-- 出版社名 -->
<dc:publisher id="publisher">${p.publisher}</dc:publisher>
<meta refines="#publisher" property="file-as">${p.publisherRuby}</meta>

<!-- 言語 -->
<dc:language>ja</dc:language>

<!-- ファイルid -->
<dc:identifier id="unique-id">${p.bookId}</dc:identifier>

<!-- 更新日 -->
<meta property="dcterms:modified">${p.modifiedDate}</meta>

<!-- Fixed-Layout Documents指定 -->
<meta property="rendition:layout">pre-paginated</meta>
<meta property="rendition:spread">landscape</meta>

<!-- etc. -->
<meta property="ebpaj:guide-version">1.1.3</meta>
<dc:contributor id="encoder">Texted-WebApp</dc:contributor>
<meta refines="#encoder" property="role" scheme="marc:relators">mrk</meta>

<!-- kindle用 -->
<meta name="original-resolution" content="${p.coverW}x${p.coverH}"/>
<meta name="RegionMagnification" content="true"/>

</metadata>

<manifest>

<!-- navigation -->
<item media-type="application/xhtml+xml" id="toc" href="navigation-documents.xhtml" properties="nav"/>
<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>

<!-- style -->
<item media-type="text/css" id="fixed-layout-jp" href="style/fixed-layout-jp.css"/>

<!-- image -->
${p.manifestImage}
<!-- xhtml -->
${p.manifestXhtml}
</manifest>

<spine toc="ncx" page-progression-direction="${p.direction}">
${p.spineStr}</spine>
</package>`
});