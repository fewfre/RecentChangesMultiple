// @ts-nocheck
export default function(){
	// Originally an import using 'mediawiki.special.recentchanges' on older wiki version, which included it as 'jquery.makeCollapsible'
	(function ($, mw) {
		$.fn.makeCollapsibleRCM = function () {
		  return this.each(function () {
			var _fn = 'jquery.makeCollapsibleRCM> ';
			var $that = $(this).addClass('rcmmw-collapsible'),
			that = this,
			collapsetext = $(this).attr('data-collapsetext'),
			expandtext = $(this).attr('data-expandtext'),
			$toggleLink,
			toggleElement = function ($collapsible, action, $defaultToggle, instantHide=undefined) {
			  if (!$collapsible.jquery) {
				return;
			  }
			  if (action != 'expand' && action != 'collapse') {
				return;
			  }
			  if (typeof $defaultToggle == 'undefined') {
				$defaultToggle = null;
			  }
			  if ($defaultToggle !== null && !($defaultToggle instanceof $)) {
				return;
			  }
			  var $containers = null;
			  if (action == 'collapse') {
				if ($collapsible.is('table')) {
				  $containers = $collapsible.find('>thead>tr, >tbody>tr');
				  if ($defaultToggle) {
					$containers.not($defaultToggle.closest('tr')).stop(true, true).fadeOut();
				  } else {
					if (instantHide) {
					  $containers.hide();
					} else {
					  $containers.stop(true, true).fadeOut();
					}
				  }
				} else if ($collapsible.is('ul') || $collapsible.is('ol')) {
				  $containers = $collapsible.find('> li');
				  if ($defaultToggle) {
					$containers.not($defaultToggle.parent()).stop(true, true).slideUp();
				  } else {
					if (instantHide) {
					  $containers.hide();
					} else {
					  $containers.stop(true, true).slideUp();
					}
				  }
				} else {
				  var $collapsibleContent = $collapsible.find('> .rcmmw-collapsible-content');
				  if ($collapsibleContent.length) {
					if (instantHide) {
					  $collapsibleContent.hide();
					} else {
					  $collapsibleContent.slideUp();
					}
				  } else {
					if ($collapsible.is('tr') || $collapsible.is('td') || $collapsible.is('th')) {
					  $collapsible.fadeOut();
					} else {
					  $collapsible.slideUp();
					}
				  }
				}
			  } else {
				if ($collapsible.is('table')) {
				  $containers = $collapsible.find('>thead>tr, >tbody>tr');
				  if ($defaultToggle) {
					$containers.not($defaultToggle.parent().parent()).stop(true, true).fadeIn();
				  } else {
					$containers.stop(true, true).fadeIn();
				  }
				} else if ($collapsible.is('ul') || $collapsible.is('ol')) {
				  $containers = $collapsible.find('> li');
				  if ($defaultToggle) {
					$containers.not($defaultToggle.parent()).stop(true, true).slideDown();
				  } else {
					$containers.stop(true, true).slideDown();
				  }
				} else {
				  var $collapsibleContent = $collapsible.find('> .rcmmw-collapsible-content');
				  if ($collapsibleContent.length) {
					$collapsibleContent.slideDown();
				  } else {
					if ($collapsible.is('tr') || $collapsible.is('td') || $collapsible.is('th')) {
					  $collapsible.fadeIn();
					} else {
					  $collapsible.slideDown();
					}
				  }
				}
				setTimeout(function () {
				  $(window).trigger('scroll');
				}, 250);
			  }
			},
			toggleLinkDefault = function (that, e) {
			  var $that = $(that),
			  $collapsible = $that.closest('.rcmmw-collapsible.rcmmw-made-collapsible').toggleClass('rcmmw-collapsed');
			  e.preventDefault();
			  e.stopPropagation();
			  if (!$that.hasClass('rcmmw-collapsible-toggle-collapsed')) {
				$that.removeClass('rcmmw-collapsible-toggle-expanded').addClass('rcmmw-collapsible-toggle-collapsed');
				if ($that.find('> a').length) {
				  $that.find('> a').text(expandtext);
				} else {
				  $that.text(expandtext);
				}
				toggleElement($collapsible, 'collapse', $that);
			  } else {
				$that.removeClass('rcmmw-collapsible-toggle-collapsed').addClass('rcmmw-collapsible-toggle-expanded');
				if ($that.find('> a').length) {
				  $that.find('> a').text(collapsetext);
				} else {
				  $that.text(collapsetext);
				}
				toggleElement($collapsible, 'expand', $that);
			  }
			  return;
			},
			toggleLinkPremade = function ($that, e) {
			  var $collapsible = $that.eq(0).closest('.rcmmw-collapsible.rcmmw-made-collapsible').toggleClass('rcmmw-collapsed');
			  if ($(e.target).is('a')) {
				return true;
			  }
			  e.preventDefault();
			  e.stopPropagation();
			  if (!$that.hasClass('rcmmw-collapsible-toggle-collapsed')) {
				$that.removeClass('rcmmw-collapsible-toggle-expanded').addClass('rcmmw-collapsible-toggle-collapsed');
				toggleElement($collapsible, 'collapse', $that);
			  } else {
				$that.removeClass('rcmmw-collapsible-toggle-collapsed').addClass('rcmmw-collapsible-toggle-expanded');
				toggleElement($collapsible, 'expand', $that);
			  }
			  return;
			},
			toggleLinkCustom = function ($that, e, $collapsible) {
			  if (e) {
				e.preventDefault();
				e.stopPropagation();
			  }
			  var action = $collapsible.hasClass('rcmmw-collapsed') ? 'expand' : 'collapse';
			  $collapsible.toggleClass('rcmmw-collapsed');
			  toggleElement($collapsible, action, $that);
			},
			buildDefaultToggleLink = function () {
			  return $('<a href="#"></a>').text(collapsetext).wrap('<span class="rcmmw-collapsible-toggle"></span>').parent().prepend('&nbsp;[').append(']&nbsp;').on('click.rcmmw-collapse', function (e) {
				toggleLinkDefault(this, e);
			  });
			};
			if (!collapsetext) {
			  collapsetext = mw.msg('collapsible-collapse');
			}
			if (!expandtext) {
			  expandtext = mw.msg('collapsible-expand');
			}
			if ($that.hasClass('rcmmw-made-collapsible')) {
			  return;
			} else {
			  $that.addClass('rcmmw-made-collapsible');
			}
			if (($that.attr('id') || '').indexOf('rcmmw-customcollapsible-') === 0) {
			  var thatId = $that.attr('id'),
			  $customTogglers = $('.' + thatId.replace('rcmmw-customcollapsible', 'rcmmw-customtoggle'));
			  mw.log(_fn + 'Found custom collapsible: #' + thatId);
			  if ($customTogglers.length) {
				$customTogglers.on('click.rcmmw-collapse', function (e) {
				  toggleLinkCustom($(this), e, $that);
				});
			  } else {
				mw.log(_fn + '#' + thatId + ': Missing toggler!');
			  }
			  if ($that.hasClass('rcmmw-collapsed')) {
				$that.removeClass('rcmmw-collapsed');
				toggleLinkCustom($customTogglers, null, $that);
			  }
			} else {
			  if ($that.is('table')) {
				var $firstRowCells = $('tr:first th, tr:first td', that),
				$toggle = $firstRowCells.find('> .rcmmw-collapsible-toggle');
				if (!$toggle.length) {
				  $toggleLink = buildDefaultToggleLink();
				  $firstRowCells.eq( - 1).prepend($toggleLink);
				} else {
				  $toggleLink = $toggle.off('click.rcmmw-collapse').on('click.rcmmw-collapse', function (e) {
					toggleLinkPremade($toggle, e);
				  });
				}
			  } else if ($that.is('ul') || $that.is('ol')) {
				var $firstItem = $('li:first', $that),
				$toggle = $firstItem.find('> .rcmmw-collapsible-toggle');
				if (!$toggle.length) {
				  var firstval = $firstItem.attr('value');
				  if (firstval === undefined || !firstval || firstval == '-1') {
					$firstItem.attr('value', '1');
				  }
				  $toggleLink = buildDefaultToggleLink();
				  $that.prepend($toggleLink.wrap('<li class="rcmmw-collapsible-toggle-li"></li>').parent());
				} else {
				  $toggleLink = $toggle.off('click.rcmmw-collapse').on('click.rcmmw-collapse', function (e) {
					toggleLinkPremade($toggle, e);
				  });
				}
			  } else {
				var $toggle = $that.find('> .rcmmw-collapsible-toggle');
				if (!$that.find('> .rcmmw-collapsible-content').length) {
				  $that.wrapInner('<div class="rcmmw-collapsible-content"></div>');
				}
				if (!$toggle.length) {
				  $toggleLink = buildDefaultToggleLink();
				  $that.prepend($toggleLink);
				} else {
				  $toggleLink = $toggle.off('click.rcmmw-collapse').on('click.rcmmw-collapse', function (e) {
					toggleLinkPremade($toggle, e);
				  });
				}
			  }
			}
			if ($that.hasClass('rcmmw-collapsed') && ($that.attr('id') || '').indexOf('rcmmw-customcollapsible-') !== 0) {
			  $that.removeClass('rcmmw-collapsed');
			  toggleElement($that, 'collapse', $toggleLink.eq(0), true);
			  $toggleLink.eq(0).click();
			}
		  });
		};
	  }) (window.jQuery, window.mediaWiki);
}