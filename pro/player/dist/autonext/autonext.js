'use strict';

/**
 * autonext button
 *
 * This feature creates a autonext button in the control bar to toggle its behavior. It will restart media once finished
 * if activated
 */

// Translations (English required)
mejs.i18n.en['mejs.autonext'] =  'Toggle autonext';

// Feature configuration
Object.assign(mejs.MepDefaults, {
	/**
	 * @type {?String}
	 */
	autonextText: null
});

Object.assign(MediaElementPlayer.prototype, {
	/**
	 * Feature constructor.
	 *
	 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
	 * @param {MediaElementPlayer} player
	 */
	buildautonext (player)  {
		const
			t = this,
			autonextTitle = mejs.Utils.isString(t.options.autonextText) ? t.options.autonextText : mejs.i18n.t('mejs.autonext'),
			autonext = document.createElement('div')
		;

		autonext.className = (player.options.autonext? 'pc-auto' : 'pc-auto disable');
		autonext.setAttribute("data-placement", "top");
		autonext.setAttribute("data-toggle", "tooltip");
		autonext.setAttribute("title", "Auto Play");
		autonext.innerHTML = '<i class="fa fa-check"></i><div class="pca-toggle"></div>';

		t.addControlElement(autonext, 'autonext');

		// add a click toggle event
		autonext.addEventListener('click', () => {
			player.options.autonext = !player.options.autonext;
			if (player.options.autonext) {
				mejs.Utils.removeClass(autonext, 'disable');
				mejs.Utils.addClass(autonext, 'enable');
			} else {
				mejs.Utils.removeClass(autonext, 'enable');
				mejs.Utils.addClass(autonext, 'disable');
			}
		});
	}
});


