// Smooth scroll for internal links (a plain jump under reduced motion)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    const href = a.getAttribute('href');
    const target = href.length>1 && document.querySelector(href);
    if(target){
      e.preventDefault();
      target.scrollIntoView({behavior: reduceMotion.matches ? 'auto' : 'smooth', block:'start'});
      // update URL hash without jump
      history.replaceState(null,null,href);
      if(href === '#main') target.focus({preventScroll:true});
    }
  });
});

// Basic contact form handler (no backend) - just a friendly toast
function handleContact(e){
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const message = form.message.value.trim();
  if(!name||!email||!message){
    alert('Please fill all fields.');
    return false;
  }
  // For now, open mailto as fallback
  const subject = encodeURIComponent(`Message from ${name} via portfolio`);
  const body = encodeURIComponent(message + '\n\nContact: ' + email);
  window.location.href = `mailto:ammarpauzan@gmail.com?subject=${subject}&body=${body}`;
  return false;
}

// small UX: open resume links in a new tab for the "open" button
document.querySelectorAll('a[href$=".pdf"]').forEach(a=>{
  a.setAttribute('target','_blank');
  a.setAttribute('rel','noopener noreferrer');
});
