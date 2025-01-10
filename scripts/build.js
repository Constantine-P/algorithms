const marked = require('marked');
const { resolve, join, sep, relative } = require('path');
const { readFile, writeFile, mkdir, copyFile } = require('node:fs/promises');
const { Buffer } = require('node:buffer');
const dirTree = require('directory-tree');

const inputDir = join(__dirname, '..', 'book');
const outputDir = join(__dirname, '..', 'build');

const toOutputArray = (tree) => {
  return tree.reduce((acc, x) => {
    const arr = [...acc];
    if (x.outputPath) {
      arr.push(x);
    }
    arr.push(...toOutputArray(x.children ?? []));
    return arr;
  }, []);
};

(async () => {
  try {
    const callback = (item, path) => {
      item.extension = path.match(/\.([\w\d]+)$/)[1];
      item.outputPath = resolve(outputDir, relative(inputDir, item.path.replace(/.md$/, '.html')));
      item.outputDirPath = item.outputPath.split(sep).slice(0, -1).join(sep);
    };
    const tree = dirTree(inputDir, { exclude: /\.json/ }, callback);
    const outputArray = toOutputArray(tree.children);
    const markdownOutputArray = outputArray.filter(x => x.extension === 'md');
    const assetsCopyArray = outputArray.filter(x => x.extension !== 'md');
    const markdownContentArray = await Promise.all(markdownOutputArray.map((node) => readFile(node.path, { encoding: 'utf-8' })));
    markdownContentArray.forEach((text, index) => {
      markdownOutputArray[index].html = marked.parse(text);
    });
    console.log(JSON.stringify(markdownOutputArray, null, 4));
    for (const node of markdownOutputArray) {
      await mkdir(node.outputDirPath, { recursive: true });
      const data = new Uint8Array(Buffer.from(node.html));
      await writeFile(node.outputPath, data, { encoding: 'utf-8' });
    }
    for (const node of assetsCopyArray) {
      await copyFile(node.path, resolve(node.outputDirPath, node.name));
    }
  } catch (err) {
    console.error(err);
  }
})();
