/** Small object illustrations mirror the collectible silhouettes in the reef. */
export function diveIcon(item, site) {
  const name=`${item.kind??''} ${item.id} ${item.name}`;
  const kind=site.kind==='survey'?'survey':/pearl|oyster/i.test(name)?'pearl':/wood|log|timber/i.test(name)?'wood':/bottle/i.test(name)?'bottle':/rope|net/i.test(name)?'rope':/bag/i.test(name)?'bag':'can';
  const shapes={
    bottle:'<path fill="#76c8b2" d="M27 9h10v13l6 9v24q-11 6-22 0V31l6-9Z"/><path fill="#f6dda4" d="M25 7h14v7H25Z"/><path fill="#e6eed1" d="M22 35h20v13H22Z"/><path d="M27 28v23" stroke="#d5fff0"/>',
    can:'<path fill="#b4bec0" d="M18 19h28v34q-14 9-28 0Z"/><ellipse fill="#e5e6c9" cx="32" cy="19" rx="14" ry="6"/><path fill="#d27854" d="M18 29h28v16H18Z"/><path d="M25 17h12m-16 6v27" stroke="#f2f5e0"/>',
    bag:'<path fill="#ddd6b7" d="m21 23-5 32q16 9 32 0l-5-32h-6V11H27v12Z"/><path d="m23 31-2 20m20-17 3 16M28 27h8" stroke="#f8f0d8"/>',
    rope:'<path fill="none" stroke="#dbb978" stroke-width="7" d="M24 19c-18 15-13 33 4 32S51 35 41 26 21 29 25 38s18 8 20-5S37 8 28 14 9 22 12 39"/><path d="m23 19 5 3m-14 5 5 2m-6 11 5-2m7 13 1-5m14 2-3-4m-3-15-2 5" stroke="#f5dfa5"/>',
    pearl:'<path fill="#c695ac" d="M10 46q3-28 22-30 19 2 22 30L34 57h-4Z"/><path d="m14 44 18 8L23 23m9-5v34l10-28m-10 28 17-10" fill="none" stroke="#edd5c8"/><ellipse fill="#819da4" cx="32" cy="46" rx="19" ry="9"/><circle fill="#ffefdc" cx="32" cy="40" r="11"/><circle fill="#fff" cx="28" cy="36" r="3"/>',
    wood:'<path fill="#a76f3b" d="m12 44 32-29 10 13-31 28Z"/><ellipse fill="#e5bb73" cx="18" cy="49" rx="9" ry="8" transform="rotate(-40 18 49)"/><path d="m25 38 18-17m-12 23 18-16" stroke="#dcab65"/><ellipse fill="none" cx="18" cy="49" rx="4" ry="3"/>',
    survey:'<path fill="#ddc28c" d="M27 9h10v47H27Z"/><path fill="#e89368" d="M37 11h18l-7 10 7 10H37Z"/><path fill="#badad0" d="m11 49 17-9 17 9-17 11Z"/><path d="m27 15 4 0m-4 10h4m-4 10h4" stroke="#fff0c8"/>'
  };
  return `<svg class="dive-object-image" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="#37595a" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">${shapes[kind]}</svg>`;
}
