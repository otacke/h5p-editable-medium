import Util from '@services/util.js';
import semantics from '@root/semantics.json';
import libraryJson from '@root/library.json';

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
   * Get semantics.
   * @param {string} [uberName] Uber name of the library.
   * @returns {object} Semantics.
   */
  static async getSemantics(uberName) {
    if (typeof uberName === 'string') {
      uberName = uberName.replace(/ /g, '-');
    }
    else {
      uberName = undefined;
    }

    if (!uberName) {
      return semantics;
    }

    const libraryPath = H5PUtil.getLibraryPath(uberName);

    const semanticsPath = `${libraryPath}/semantics.json`;

    try {
      const response = await fetch(semanticsPath);
      if (!response.ok) {
        return;
      }

      return response.json();
    }
    catch (error) {
      return;
    }
  }

  /**
   * Get the library path for a given ubername.
   * @param {string} uberName Ubername of the library.
   * @returns {string} Library path.
   */
  static getLibraryPath(uberName) {
    const libraryPath = H5P.getLibraryPath(uberName);

    // Workaround for H5P CLI that may return wrong path when using H5P.getLibraryPath.
    return libraryPath.replace(/(-\d+\.\d+)(\.\d+)?$/, '$1');
  }

  /**
   * Find a semantics field by name in a semantics structure. Beware of duplicate field names!
   * @param {string} fieldName Name of the field to find.
   * @param {object|Array} semanticsStructure Semantics structure to search in.
   * @returns {object|null} The first semantics field that fits, null otherwise.
   */
  static findSemanticsField(fieldName, semanticsStructure = semantics) {
    if (!semanticsStructure) {
      return null;
    }

    if (Array.isArray(semanticsStructure)) {
      return semanticsStructure
        .map((semanticsChunk) => H5PUtil.findSemanticsField(fieldName, semanticsChunk))
        .find((result) => result !== null) || null;
    }

    if (semanticsStructure.name === fieldName) {
      return semanticsStructure;
    }

    if (semanticsStructure.field) {
      const result = H5PUtil.findSemanticsField(fieldName, semanticsStructure.field);
      if (result !== null) {
        return result;
      }
    }

    if (semanticsStructure.fields) {
      const result = H5PUtil.findSemanticsField(fieldName, semanticsStructure.fields);
      if (result !== null) {
        return result;
      }
    }

    return null;
  }

  /**
   * Get a translated version of semantics if available.
   * @param {string} languageCode Language code.
   * @param {string} [uberName] Uber name of the library.
   * @returns {object} Translated semantics structure.
   */
  static async getTranslatedSemantics(languageCode, uberName) {
    const semanticsJson = (uberName) ?
      await H5PUtil.getSemantics(uberName) :
      semantics;

    if (!semanticsJson) {
      return;
    }

    if (!languageCode || languageCode === 'en') {
      return semanticsJson;
    }

    const translation = await H5PUtil.getTranslation(languageCode, uberName);

    if (!translation?.semantics) {
      return semanticsJson;
    }

    return Util.mergeDeep(semanticsJson, translation.semantics);
  }

  /**
   * Get version for an H5P machine name.
   * @param {string} machineName Machine name of the library.
   * @returns {string} Version of the library as major.minor or empty string if not found.
   */
  static getLibraryVersion(machineName) {
    if (!machineName) {
      return '';
    }

    // Not all H5P integrations provide H5PIntegration.libraryDirectories where the loaded version could be retrieved.
    const dependencies = H5PUtil.getDependencies();
    return dependencies.find((dep) => dep.startsWith(machineName))?.split(' ').pop() || '';
  }

  /**
   * Get the Uber name of the library.
   * @returns {string} Uber name of the content type.
   */
  static getUberNameNoSpaces() {
    return `${libraryJson.machineName}-${libraryJson.majorVersion}.${libraryJson.minorVersion}`;
  }

  /**
   * Get all dependencies for the library.
   * @returns {object[]} List of dependency machine names.
   */
  static getDependencies() {
    const dependencies = [
      ...(libraryJson?.preloadedDependencies ?? []),
      ...(libraryJson?.editorDependencies ?? []),
    ];
    return dependencies.map((dep) => `${dep.machineName} ${dep.majorVersion}.${dep.minorVersion}`);
  }

  /**
   * Get translation file contents for a given language code.
   * @param {string} [languageCode] Language code.
   * @param {string} [uberName] Uber name of the library.
   * @returns {Promise<object>} Translation object or undefined if not found.
   */
  static async getTranslation(languageCode = 'en', uberName) {
    if (typeof uberName === 'string') {
      uberName = uberName.replace(/ /g, '-');
    }
    else {
      uberName = undefined;
    }

    const libraryPath = H5PUtil.getLibraryPath(uberName ?? H5PUtil.getUberNameNoSpaces());
    const languagePath = `${libraryPath}/language/${languageCode}.json`;

    try {
      const response = await fetch(languagePath);
      if (!response.ok) {
        return;
      }

      const translation = await response.json();
      return translation;
    }
    catch (error) {
      return;
    }
  }

  /**
   * Determine whether the H5P editor is being used.
   * @returns {boolean} True if the H5P editor is being used, false otherwise.
   */
  static isEditor() {
    return window.H5PEditor !== undefined;
  }
}
