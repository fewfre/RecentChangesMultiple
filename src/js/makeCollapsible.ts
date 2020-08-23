export default function(){
	// Originally an import using 'mediawiki.special.recentchanges' on older wiki version, which included it as 'jquery.makeCollapsible'
	(function ($, mw) {
		$.fn.makeCollapsible = function () {
		  return this.each(function () {
			var _fn = 'jquery.makeCollapsible> ';
			var $that = $(this).addClass('mw-collapsible'),
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
				  var $collapsibleContent = $collapsible.find('> .mw-collapsible-content');
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
				  var $collapsibleContent = $collapsible.find('> .mw-collapsible-content');
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
			  $collapsible = $that.closest('.mw-collapsible.mw-made-collapsible').toggleClass('mw-collapsed');
			  e.preventDefault();
			  e.stopPropagation();
			  if (!$that.hasClass('mw-collapsible-toggle-collapsed')) {
				$that.removeClass('mw-collapsible-toggle-expanded').addClass('mw-collapsible-toggle-collapsed');
				if ($that.find('> a').length) {
				  $that.find('> a').text(expandtext);
				} else {
				  $that.text(expandtext);
				}
				toggleElement($collapsible, 'collapse', $that);
			  } else {
				$that.removeClass('mw-collapsible-toggle-collapsed').addClass('mw-collapsible-toggle-expanded');
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
			  var $collapsible = $that.eq(0).closest('.mw-collapsible.mw-made-collapsible').toggleClass('mw-collapsed');
			  if ($(e.target).is('a')) {
				return true;
			  }
			  e.preventDefault();
			  e.stopPropagation();
			  if (!$that.hasClass('mw-collapsible-toggle-collapsed')) {
				$that.removeClass('mw-collapsible-toggle-expanded').addClass('mw-collapsible-toggle-collapsed');
				toggleElement($collapsible, 'collapse', $that);
			  } else {
				$that.removeClass('mw-collapsible-toggle-collapsed').addClass('mw-collapsible-toggle-expanded');
				toggleElement($collapsible, 'expand', $that);
			  }
			  return;
			},
			toggleLinkCustom = function ($that, e, $collapsible) {
			  if (e) {
				e.preventDefault();
				e.stopPropagation();
			  }
			  var action = $collapsible.hasClass('mw-collapsed') ? 'expand' : 'collapse';
			  $collapsible.toggleClass('mw-collapsed');
			  toggleElement($collapsible, action, $that);
			},
			buildDefaultToggleLink = function () {
			  return $('<a href="#"></a>').text(collapsetext).wrap('<span class="mw-collapsible-toggle"></span>').parent().prepend('&nbsp;[').append(']&nbsp;').bind('click.mw-collapse', function (e) {
				toggleLinkDefault(this, e);
			  });
			};
			if (!collapsetext) {
			  collapsetext = mw.msg('collapsible-collapse');
			}
			if (!expandtext) {
			  expandtext = mw.msg('collapsible-expand');
			}
			if ($that.hasClass('mw-made-collapsible')) {
			  return;
			} else {
			  $that.addClass('mw-made-collapsible');
			}
			if (($that.attr('id') || '').indexOf('mw-customcollapsible-') === 0) {
			  var thatId = $that.attr('id'),
			  $customTogglers = $('.' + thatId.replace('mw-customcollapsible', 'mw-customtoggle'));
			  mw.log(_fn + 'Found custom collapsible: #' + thatId);
			  if ($customTogglers.length) {
				$customTogglers.bind('click.mw-collapse', function (e) {
				  toggleLinkCustom($(this), e, $that);
				});
			  } else {
				mw.log(_fn + '#' + thatId + ': Missing toggler!');
			  }
			  if ($that.hasClass('mw-collapsed')) {
				$that.removeClass('mw-collapsed');
				toggleLinkCustom($customTogglers, null, $that);
			  }
			} else {
			  if ($that.is('table')) {
				var $firstRowCells = $('tr:first th, tr:first td', that),
				$toggle = $firstRowCells.find('> .mw-collapsible-toggle');
				if (!$toggle.length) {
				  $toggleLink = buildDefaultToggleLink();
				  $firstRowCells.eq( - 1).prepend($toggleLink);
				} else {
				  $toggleLink = $toggle.unbind('click.mw-collapse').bind('click.mw-collapse', function (e) {
					toggleLinkPremade($toggle, e);
				  });
				}
			  } else if ($that.is('ul') || $that.is('ol')) {
				var $firstItem = $('li:first', $that),
				$toggle = $firstItem.find('> .mw-collapsible-toggle');
				if (!$toggle.length) {
				  var firstval = $firstItem.attr('value');
				  if (firstval === undefined || !firstval || firstval == '-1') {
					$firstItem.attr('value', '1');
				  }
				  $toggleLink = buildDefaultToggleLink();
				  $that.prepend($toggleLink.wrap('<li class="mw-collapsible-toggle-li"></li>').parent());
				} else {
				  $toggleLink = $toggle.unbind('click.mw-collapse').bind('click.mw-collapse', function (e) {
					toggleLinkPremade($toggle, e);
				  });
				}
			  } else {
				var $toggle = $that.find('> .mw-collapsible-toggle');
				if (!$that.find('> .mw-collapsible-content').length) {
				  $that.wrapInner('<div class="mw-collapsible-content"></div>');
				}
				if (!$toggle.length) {
				  $toggleLink = buildDefaultToggleLink();
				  $that.prepend($toggleLink);
				} else {
				  $toggleLink = $toggle.unbind('click.mw-collapse').bind('click.mw-collapse', function (e) {
					toggleLinkPremade($toggle, e);
				  });
				}
			  }
			}
			if ($that.hasClass('mw-collapsed') && ($that.attr('id') || '').indexOf('mw-customcollapsible-') !== 0) {
			  $that.removeClass('mw-collapsed');
			  toggleElement($that, 'collapse', $toggleLink.eq(0), true);
			  $toggleLink.eq(0).click();
			}
		  });
		};
	  }) ((<any>window).jQuery, (<any>window).mediaWiki);
}