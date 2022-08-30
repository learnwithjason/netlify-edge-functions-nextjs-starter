import { Context } from 'https://edge.netlify.com';
import manifest from '../../lib/uniform/contextManifest.json' assert { type: 'json' };
import {
  createEdgeContext,
  createUniformEdgeHandler,
  buildNetlifyQuirks,
} from '../../lib/uniform/index.deno.js';

const IGNORED_PATHS = /\/.*\.(ico|png|jpg|jpeg|svg|css|js|json)(?:\?.*|$)$/g;

export default async (request: Request, netlifyContext: Context) => {
  // ignoring requests that are not pages
  if (
    request.method.toUpperCase() !== 'GET' ||
    request.url.match(IGNORED_PATHS)
  ) {
    return await netlifyContext.next({ sendConditionalRequest: true });
  }

  const context = createEdgeContext({
    manifest: manifest,
    request,
  });

  const originResponse = await netlifyContext.next();

  const country = netlifyContext.geo?.country?.code || 'US';
  const north = ['US', 'CA', 'BE', 'DE', 'MX', 'IT'];
  // const south = ['AU', 'NZ', 'CO', 'PE', 'VE', 'EC', 'CH', 'AR', 'BR'];

  const hemisphere = north.includes(country) ? 'north' : 'south';

  console.log({ hemisphere, country });

  // Do secret stuff
  const res = await fetch(
    'https://cdpmock.netlify.app/profile/v1/spaces/space_1/collections/users/profiles/user_id:2/traits',
  );

  if (!res.ok) {
    console.error('oops');
  }

  const data = await res.json();

  const handler = createUniformEdgeHandler();
  const { processed, response } = await handler({
    context,
    request,
    response: originResponse,
    quirks: {
      ...data.traits,
      hemisphere,
      ...buildNetlifyQuirks(netlifyContext),
    },
  });

  // logging, feel free to remove it
  if (processed) {
    console.log('Edge Function processed request: ', {
      url: request.url,
      processed,
    });
  }

  if (!processed) {
    return response;
  }

  return new Response(response.body, {
    ...response,
    headers: {
      ...response.headers,
      'Cache-Control': 'no-store, must-revalidate',
      Expires: '0',
    },
  });
};
