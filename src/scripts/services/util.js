import { decode } from 'he';

/** Class for utility functions */
export default class Util {
  /**
   * Add mixins to a class, useful for splitting files.
   * @param {object} [master] Master class to add mixins to.
   * @param {object[]|object} [mixins] Mixins to be added to master.
   */
  static addMixins(master = {}, mixins = []) {
    if (!master.prototype) {
      return;
    }

    if (!Array.isArray(mixins)) {
      mixins = [mixins];
    }

    const masterPrototype = master.prototype;

    mixins.forEach((mixin) => {
      const mixinPrototype = mixin.prototype;
      Object.getOwnPropertyNames(mixinPrototype).forEach((property) => {
        if (property === 'constructor') {
          return; // Don't need constructor
        }

        if (Object.getOwnPropertyNames(masterPrototype).includes(property)) {
          return; // property already present, do not override
        }

        masterPrototype[property] = mixinPrototype[property];
      });
    });
  }

  /**
   * Deep clone an object.
   *
   * `structuredClone()` can be used to replace the jQuery dependency (and this)
   * util function alltogether, when jQuery is removed from H5P core, but
   * currently it's not supported by Safari 15.4 which would mean to still
   * violate the latest 3 browsers rule.
   * @param {object} obj Object to clone.
   * @returns {object} Cloned object.
   */
  static clone(obj) {
    return window.structuredClone ?
      structuredClone(obj) :
      H5P.jQuery.extend(true, {}, obj);
  }

  /**
   * Extend an array just like JQuery's extend.
   * @returns {object} Merged objects.
   */
  static extend() {
    for (let i = 1; i < arguments.length; i++) {
      for (let key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          if (
            typeof arguments[0][key] === 'object' &&
            typeof arguments[i][key] === 'object'
          ) {
            this.extend(arguments[0][key], arguments[i][key]);
          }
          else if (arguments[i][key] !== undefined) {
            arguments[0][key] = arguments[i][key];
          }
        }
      }
    }
    return arguments[0];
  }

  /**
   * HTML decode and strip HTML.
   * @param {string|object} html html.
   * @returns {string} html value.
   */
  static purifyHTML(html) {
    if (typeof html !== 'string') {
      return '';
    }

    let text = decode(html);
    const div = document.createElement('div');
    div.innerHTML = text;
    text = div.textContent || div.innerText || '';

    return text;
  }

  /**
   * Call callback function once dom element gets visible in viewport.
   * @async
   * @param {HTMLElement} dom DOM element to wait for.
   * @param {function} callback Function to call once DOM element is visible.
   * @param {object} [options] IntersectionObserver options.
   * @returns {IntersectionObserver} Promise for IntersectionObserver.
   */
  static async callOnceVisible(dom, callback, options = {}) {
    if (typeof dom !== 'object' || typeof callback !== 'function') {
      return; // Invalid arguments
    }

    options.threshold = options.threshold || 0;

    return await new Promise((resolve) => {
      // iOS is behind ... Again ...
      const idleCallback = window.requestIdleCallback ?
        window.requestIdleCallback :
        window.requestAnimationFrame;

      idleCallback(() => {
        // Get started once visible and ready
        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            observer.unobserve(dom);
            observer.disconnect();

            callback();
          }
        }, {
          ...(options.root && { root: options.root }),
          threshold: options.threshold,
        });
        observer.observe(dom);

        resolve(observer);
      });
    });
  }

  static mergeDeep(obj1, obj2) {
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      const maxLength = Math.max(obj1.length, obj2.length);
      const result = [];
      for (let i = 0; i < maxLength; i++) {
        if (i in obj2) {
          result[i] = Util.mergeDeep(obj1[i], obj2[i]);
        }
        else {
          result[i] = obj1[i];
        }
      }
      return result;
    }

    if (
      typeof obj1 === 'object' && obj1 !== null && !Array.isArray(obj1) &&
      typeof obj2 === 'object' && obj2 !== null && !Array.isArray(obj2)
    ) {
      const result = { ...obj1 };
      for (const key in obj2) {
        result[key] = Util.mergeDeep(obj1[key], obj2[key]);
      }
      return result;
    }

    // Primitive or obj2 overrides
    return obj2 !== undefined ? obj2 : obj1;
  }

  static paramsArrayToPlainObject(arr) {
    const result = {};

    arr.forEach((item) => {
      if (Array.isArray(item.value)) {
        result[item.name] = paramsArrayToPlainObject(item.value);
      }
      else {
        result[item.name] = item.value;
      }
    });

    return result;
  }
}
