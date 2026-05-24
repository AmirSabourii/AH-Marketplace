const text = `
[500, 200, 600, 400] sofa
[700, 100, 900, 800] rug
`;

const regex = /\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]\s*([^\[\n]+)/g;
let match;
while ((match = regex.exec(text)) !== null) {
  console.log({
    ymin: match[1],
    xmin: match[2],
    ymax: match[3],
    xmax: match[4],
    label: match[5].trim()
  });
}
