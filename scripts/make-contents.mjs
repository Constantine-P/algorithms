import { convert, reverse } from 'rus-eng-transliteration';
import { join } from 'path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import * as dree from 'dree';

const inputDir = 'book';
const outputDir = 'book';

const headingRegexp = /## (?<heading>[\s\S]+?)\r\n/g;

const readWriteOptions = { encoding: 'utf-8' };

const dirCallback = function (node) {
  delete node.isSymbolicLink;
  delete node.sizeInBytes;
  delete node.size;
  delete node.extension;
  delete node.type;
  node.items = node.children;
  delete node.children;
  const isLeaf = node.items.length === 1 && node.items[0].type === 'file';
  if (isLeaf) {
    const fileNode = node.items[0];
    const data = fs.readFileSync(`${inputDir}/${fileNode.relativePath}`, readWriteOptions);
    node.items = Array.from(data.matchAll(headingRegexp)).map((x, index) => {
      const label = x.groups.heading.replaceAll(/[^a-zA-Zа-яА-Я0-9_\s]/g, '');;
      return ({
        path: node.relativePath + `#${convert(label, { slugify: true, lowerCase: true })}`,
        label,
        num: index + 1,
      });
    });
    node.filePath = `${fileNode.relativePath}`;
  }
  node.path = node.relativePath;
  delete node.relativePath;
  node.num = 0;
  if (node.name !== inputDir) {
    node.label = reverse(node.name.slice(3)).replaceAll('-', ' ');
    node.label = node.label[0].toUpperCase() + node.label.slice(1);
    node.num = Number(node.name.slice(0, 2));
  } else {
    node.path = '';
  }
  if (!node.items.length) {
    delete node.items;
  }
};

try {
  const tree = await dree.scan(
    inputDir,
    {
      size: false,
      hash: false,
      extensions: ['md'],
    },
    null,
    dirCallback,
  );
  await fsp.writeFile(
    join(outputDir, 'contents.json'),
    JSON.stringify(tree, null, 2),
    readWriteOptions,
  );
} catch (err) {
  console.error(err);
}
