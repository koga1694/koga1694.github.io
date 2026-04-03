export default function (eleventyConfig) {
  // CSS 파일은 그대로 복사
  eleventyConfig.addPassthroughCopy("src/css");

  // .nojekyll 파일을 추가하여 Jekyll 처리를 비활성화
  eleventyConfig.addPassthroughCopy("src/.nojekyll");

  // 프로젝트 섹션을 컬렉션으로 등록
  eleventyConfig.addCollection("doyourself", (collectionApi) => {
    return collectionApi
      .getFilteredByTag("doyourself")
      .sort((a, b) => (a.data.order || 99) - (b.data.order || 99));
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
}
