$(document).ready(function(){
	headerBrandsPopup();
	makeHoverMenu();
});
function headerBrandsPopup()
{

	var $container=$('.ce_text_header_brands');
	if($container.size()==0) return;

	var $title=$container.find('h1');
	$title.addClass('js').addClass('collapsed');

	var $popup=$container.find('.brands_popup');

	function stopPropagation(e)
	{
		e.stopPropagation();
	}

	function showPopup() {
		if($popup.is(':hidden'))
		{
			$container.mouseleave(hidePopup);
			$title.removeClass('collapsed').addClass('expanded');
			$popup.slideDown('200');
		}
	}
	function hidePopup() {
		if($popup.is(':visible'))
		{
			$container.unbind('mouseleave');
			$title.removeClass('expanded').addClass('collapsed');
			$popup.hide();
		}
	}
	function togglePopup() {
		if($popup.is(':hidden'))
		{
			showPopup();
		}
		else
		{
			hidePopup();
		}
	}


	$title.click(togglePopup);
	$title.mouseenter(showPopup);


	$(document).click(hidePopup);
	$title.click(stopPropagation);
	$popup.click(stopPropagation);
}
function makeHoverMenu()
{
	var $items=$('#header .mainnav ul.level_1 > li.submenu:parent');
	$items.children('a,span').addClass('dropdown');

	$items.hover(
		function()
		{
			var $this=$(this);
			$this.addClass('hover');
			$this.children('a,span').addClass('hover');

			$this.children('ul').slideDown(100);
		},
		function()
		{
			var $this=$(this);
			$this.removeClass('hover');
			$this.children('a,span').removeClass('hover');

			$this.children('ul').hide();
		}
	);


	var isie=/\bMSIE\b/.test(navigator.appVersion);
	if(isie)
	{
		var iever=parseFloat(navigator.appVersion.split("MSIE")[1]);
		if(iever<=7)
		{
			var $e=$('.mainnav ul.level_2');
			var zIndex=parseInt($e.css('z-index'),10);
			while($e.size()>0)
			{
				$e.css('z-index',zIndex);
				$e=$e.parent();
			}
		}
	}

}