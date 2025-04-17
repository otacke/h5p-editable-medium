import semantics from '@root/semantics.json';

/** Class for h5p related utility functions */
export default class H5PUtil {
  /**
   * Get default values from semantics fields.
   * @param {object[]} start Start semantics field.
   * @returns {object} Default values from semantics.
   */
  static getSemanticsDefaults(start = semantics) {
    let defaults = {};

    if (!Array.isArray(start)) {
      return defaults; // Must be array, root or list
    }

    start.forEach((entry) => {
      if (typeof entry.name !== 'string') {
        return;
      }

      if (typeof entry.default !== 'undefined') {
        defaults[entry.name] = entry.default;
      }
      if (entry.type === 'list') {
        defaults[entry.name] = []; // Does not set defaults within list items!
      }
      else if (entry.type === 'group' && entry.fields) {
        const groupDefaults = H5PUtil.getSemanticsDefaults(entry.fields);
        if (Object.keys(groupDefaults).length) {
          defaults[entry.name] = groupDefaults;
        }
      }
    });

    return defaults;
  }

  /**
   * Get loaded library version for an H5P machine name.
   * @param {string} machineName Machine name of the library.
   * @returns {string} Version of the library as major.minor or empty string if not found.
   */
  static getLibraryVersion(machineName) {
    if (!machineName) {
      return '';
    }

    const dirs = H5PIntegration?.libraryDirectories ?? {};
    const matchedKey = Object.keys(dirs).find((key) => key.startsWith(machineName));

    return matchedKey ? matchedKey.split('-').pop() : '';
  }
}
