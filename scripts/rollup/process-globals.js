export default {
  name: 'process-globals',
  resolveId(source) {
    if (source === 'process') {
      return { id: '\0virtual:process', moduleSideEffects: false };
    }
    return null;
  },
  load(id) {
    if (id === '\0virtual:process') {
      return `
        export const cwd = () => '/home/rossg/src/gnome-shell-balance-watch';
        export const platform = 'linux';
      `;
    }
    return null;
  },
};