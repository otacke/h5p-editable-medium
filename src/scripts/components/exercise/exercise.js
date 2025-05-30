import Util from '@services/util.js';
import H5PUtil from '@services/h5p-util.js';
import './exercise.scss';

export default class Exercise {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({}, callbacks);

    this.handleBubbleDownResize = this.handleBubbleDownResize.bind(this);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editable-medium-exercise-instance');

    const machineName = this.params.contentType.library.split(' ')[0];

    if (machineName === 'H5P.Image') {
      this.dom.classList.add(`sizing-${this.params.viewFields.sizingMode}`);

      if (this.params.viewFields.sourceURL) {
        let extension = this.params.viewFields.sourceURL.split('.').pop();
        if (extension === 'svg') {
          extension = 'svg+xml';
        }
        else if (extension === 'jpg') {
          extension = 'jpeg';
        }

        this.params.contentType.params.file = {
          mime: `image/${extension}`,
          path: this.params.viewFields.sourceURL
        };
        // Not setting size here, but we don't need it ourselves
      }
    }
    else if (machineName === 'H5P.Audio') {
      this.params.contentType.params.fitToWrapper = true;

      if (this.params.viewFields.playerMode) {
        this.params.contentType.params.playerMode = this.params.viewFields.playerMode;
      }

      if (this.params.viewFields.sourceURL) {
        let extension = this.params.viewFields.sourceURL.split('.').pop();
        if (extension === 'mp3') {
          extension = 'mpeg';
        }
        else if (extension === 'ogv' || extension === 'oga') {
          extension = 'ogg';
        }

        this.params.contentType.params.files = [
          {
            copyright: { license: 'U' },
            mime: `audio/${extension}`,
            path: this.params.viewFields.sourceURL
          }
        ];
      }
    }
    else if (machineName === 'H5P.Video') {
      if (this.params.viewFields.sourceURL) {
        let extension;

        const regExpYouTube = new RegExp(
          '(?:https?:\\/\\/)?' +
          '(?:www\\.)?' +
          '(?:(?:youtube\\.com\\/' +
            '(?:attribution_link\\?(?:\\S+))?' +
            '(?:v\\/|embed\\/|watch\\/|(?:user\\/(?:\\S+)\\/)?watch(?:\\S+)v=))|' +
            '(?:youtu\\.be\\/|y2u\\.be\\/))' +
          '([A-Za-z0-9_-]{11})',
          'i'
        );
        const regExpPanopto = /^[^\/]+:\/\/([^\/]+)\/Panopto\/.+\?id=(.+)$/i;
        const regExpVimeo = /^.*(vimeo\.com\/)((channels\/[A-z]+\/)|(groups\/[A-z]+\/videos\/))?([0-9]+)/i;
        const regExpEcho360 = /^[^\/]+:\/\/(echo360[^\/]+)\/media\/([^\/]+)\/h5p.*$/i;

        if (this.params.viewFields.sourceURL.match(regExpYouTube)) {
          extension = 'YouTube';
        }
        else if (this.params.viewFields.sourceURL.match(regExpPanopto)) {
          extension = 'Panopto';
        }
        else if (this.params.viewFields.sourceURL.match(regExpVimeo)) {
          extension = 'Vimeo';
        }
        else if (this.params.viewFields.sourceURL.match(regExpEcho360)) {
          extension = 'Echo360';
        }
        else {
          extension = this.params.viewFields.sourceURL.split('.').pop();
          if (extension === 'ogv') {
            extension = 'ogg';
          }
        }

        this.params.contentType.params.sources = [
          {
            copyright: { license: 'U' },
            mime: `video/${extension}`,
            path: this.params.viewFields.sourceURL
          }
        ];

        const isVideoFormat = ['video/mp4', 'video/webm', 'video/ogg']
          .includes(this.params.contentType.params.sources[0].mime);
        this.params.contentType.params.visuals = this.params.contentType.params.visuals || {};
        this.params.contentType.params.visuals.fit = isVideoFormat || false;
      }
    }

    this.initializeInstance();

    this.attachInstance();
  }

  /**
   * Get DOM with H5P exercise.
   * @returns {HTMLElement} DOM with H5P exercise.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Initialize H5P instance.
   * @param {boolean} [attach] If true, attach instance to DOM.
   */
  initializeInstance(attach = true) {
    if (this.instance === null || this.instance) {
      return; // Only once, please
    }

    const contentId = H5PUtil.isEditor() ? H5PEditor.contentId : this.params.globals.get('contentId');

    if (!this.instance) {
      this.instance = H5P.newRunnable(
        this.params.contentType,
        contentId,
        undefined,
        true,
        { previousState: this.params.previousState?.instanceState }
      );
    }

    if (!this.instance) {
      return;
    }

    if (this.instance?.libraryInfo.machineName === 'H5P.Image') {
      this.instance.on('loaded', () => {
        this.params.globals.get('mainInstance').trigger('resize');
      });
    }

    // Resize parent when children resize
    this.bubbleUp(
      this.instance, 'resize', this.params.globals.get('mainInstance')
    );


    this.startBubbleDownResize();
  }

  /**
   * Get current state.
   * @returns {object} Current state to be retrieved later.
   */
  getCurrentState() {
    return {
      instanceState: this.instance?.getCurrentState?.()
    };
  }

  /**
   * Get xAPI data from exercises.
   * @returns {object[]} XAPI data objects used to build report.
   */
  getXAPIData() {
    return this.instance.getXAPIData?.();
  }

  /**
   * Make it easy to bubble events from child to parent.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object} target Target to trigger event on.
   */
  bubbleUp(origin, eventName, target) {
    origin.on(eventName, (event) => {
      // Prevent target from sending event back down
      target.bubblingUpwards = true;

      // Trigger event
      target.trigger(eventName, event);

      // Reset
      target.bubblingUpwards = false;
    });
  }

  startBubbleDownResize() {
    const mainInstance = this.params.globals.get('mainInstance');
    mainInstance.on('resize', this.handleBubbleDownResize);
  }

  handleBubbleDownResize(event) {
    const mainInstance = this.params.globals.get('mainInstance');

    if (mainInstance.bubblingUpwards) {
      return; // Prevent send event back down.
    }

    if (this.isAttached) {
      this.instance.trigger('resize', event);
    }
  }

  stopBubbleDownResize() {
    const mainInstance = this.params.globals.get('mainInstance');
    mainInstance.off('resize', this.handleBubbleDownResize);
  }

  /**
   * Attach instance to DOM.
   */
  attachInstance() {
    if (this.isAttached || !this.instance) {
      return; // No instance or already attached. Listeners would go missing on re-attaching.
    }

    this.instance.attach(H5P.jQuery(this.dom));

    this.isAttached = true;
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.isInitial] If true, don't overwrite presets.
   */
  reset(params = {}) {
    /*
     * If not attached yet, some contents can fail (e. g. CP), but contents
     * that are not attached never had a previous state change, so okay
     */
    if (!this.isAttached) {
      this.attachInstance();
    }

    if (!params.isInitial && this.instance) {
      if (typeof this.instance.resetTask === 'function') {
        this.instance.resetTask();
      }
      else {
        this.stopBubbleDownResize();
        delete this.instance;
        this.initializeInstance();
        this.isAttached = false;
      }
    }
  }

  getSummary() {
    const machineName = this.params.contentType.library.split(' ')[0];
    const plainName = machineName.replace('H5P.', '').toLowerCase();
    const type = this.params.dictionary.get(`a11y.${plainName}`);

    let summary = '';
    if (machineName === 'H5P.Image') {
      summary = this.params.contentType?.params?.alt ?? this.params.contentType?.metadata?.title;
    }
    else if (machineName === 'H5P.Audio') {
      summary = this.params.contentType?.metadata?.title;
    }
    else if (machineName === 'H5P.Video') {
      summary = this.params.contentType?.metadata?.title;
    }

    if (!summary) {
      return type;
    }
    else {
      return `${type}: ${summary}`;
    }
  }
}
