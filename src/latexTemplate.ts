export const latexPreamble = String.raw`\documentclass{report}

\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[english,french]{babel}
\usepackage{amsmath,amssymb,amsthm,amsfonts}
\usepackage{graphicx}
\usepackage{hyperref}
\usepackage{geometry}
\geometry{margin=2.5cm}
\usepackage{fancyhdr}
\usepackage{enumitem}
\usepackage{dsfont}
\usepackage{xcolor}
\usepackage{textcomp}
\usepackage{mathrsfs}
\usepackage{bbold}
\usepackage{physics}
\usepackage[most]{tcolorbox}
\usepackage{tikz}
\usetikzlibrary{arrows.meta,angles,quotes,decorations.markings}

\newcounter{exo}

\newenvironment{exercice}
{
\refstepcounter{exo}
\par\medskip
\noindent\textbf{Exercice \theexo.}
}
{\medskip}

\newcommand{\correction}{\par\medskip\noindent\textbf{Correction.}\ }

\theoremstyle{definition}
\newtheorem{definition}{Définition}[section]
\newtheorem{remarque}[definition]{Remarque}
\newtheorem{exemple}[definition]{Exemple}
\newtheorem{proposition}[definition]{Proposition}
\newtheorem{corollaire}[definition]{Corollaire}
\newtheorem{lemme}[definition]{Lemme}
\newtheorem{notation}[definition]{Notation}
\newtheorem{theoreme}[definition]{Théorème}
\newtheorem{propriete}[definition]{Propriété}

\newcommand{\ds}{\displaystyle}
\newcommand{\limn}{\displaystyle\lim_{n\to+\infty}}
\newcommand{\un}{(u_n)_{n\ge 0}\in\mathbb{C}^{\mathbb{N}}}
\newcommand{\Un}{(U_n)_{n\ge 0}\in\mathbb{C}^{\mathbb{N}}}
\newcommand{\vn}{(v_n)_{n\ge 0}\in\mathbb{C}^{\mathbb{N}}}
\newcommand{\wn}{(w_n)_{n\ge 0}\in\mathbb{C}^{\mathbb{N}}}
\newcommand{\sumun}{\displaystyle\sum_{n\ge 0}u_n}
\newcommand{\sumvn}{\displaystyle\sum_{n\ge 0}v_n}

\newtcolorbox{myBox}[3][]{
arc=5mm,
lower separated=false,
fonttitle=\bfseries,
colbacktitle=white!10,
coltitle=black!50!black,
enhanced,
attach boxed title to top left={xshift=0.5cm,yshift=-2mm},
colframe=green!50!black,
colback=white!10,
overlay={
\node[draw=black!50!black,thick,
fill=white!10,rounded corners=1mm,
xshift=-0.5cm,left,
text=black!50!black,
anchor=east,font=\bfseries]
at (frame.north east) {#3};},
title=#2,#1}

\newtcolorbox{myBoxd}[3][]{
arc=5mm,
lower separated=false,
fonttitle=\bfseries,
colbacktitle=white!10,
coltitle=black!50!black,
enhanced,
attach boxed title to top left={xshift=0.5cm,yshift=-2mm},
colframe=blue!50!black,
colback=white!10,
overlay={
\node[draw=black!50!black,thick,
fill=white!10,rounded corners=1mm,
xshift=-0.5cm,left,
text=black!50!black,
anchor=east,font=\bfseries]
at (frame.north east) {#3};},
title=#2,#1}

\renewcommand{\chaptername}{Chapitre}
`;

export function escapeLatexTitle(value: string) {
  return value
    .replaceAll("\\", String.raw`\textbackslash{}`)
    .replaceAll("&", String.raw`\&`)
    .replaceAll("%", String.raw`\%`)
    .replaceAll("$", String.raw`\$`)
    .replaceAll("#", String.raw`\#`)
    .replaceAll("_", String.raw`\_`)
    .replaceAll("{", String.raw`\{`)
    .replaceAll("}", String.raw`\}`)
    .replaceAll("~", String.raw`\textasciitilde{}`)
    .replaceAll("^", String.raw`\textasciicircum{}`);
}

export function buildLatexDocument(
  subjectTitle: string,
  chapterTitle: string,
  pages: { title: string; latex: string }[]
) {
  const body = pages
    .map((page) => {
      const content = page.latex.trim() || "% Aucun contenu LaTeX pour cette page.";
      return String.raw`\section{${escapeLatexTitle(page.title)}}

${content}
`;
    })
    .join("\n");

  return `${latexPreamble}

\\title{${escapeLatexTitle(chapterTitle)}}
\\author{MathMaster Notes}
\\date{\\today}

\\begin{document}

\\maketitle
\\tableofcontents

\\chapter{${escapeLatexTitle(subjectTitle)}}
${body}
\\end{document}
`;
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/x-tex;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
